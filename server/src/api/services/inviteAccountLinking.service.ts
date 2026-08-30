import { Injectable, Inject } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import type { InviteClaimedEvent } from '@/types/events/invite-claimed.event'
import { IExternalUserAccountRepository, ISubscriptionRepository } from '@/data/repositories'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { IntegrationProvider, AppEvent, SubscriptionStatus } from '@/types/enums'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseService } from './base.service'
import { ConfigService } from './config.service'
import { SystemConfigKey } from '@/types/models/SystemConfig'

@Injectable()
export class InviteAccountLinkingService extends BaseService {
    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(ISubscriptionRepository) private subscriptionRepository: ISubscriptionRepository,
        @Inject(IExternalUserAccountRepository)
        private externalAccountRepository: IExternalUserAccountRepository,
        @Inject(AccountIntegrationRegistry) private integrationRegistry: AccountIntegrationRegistry,
        @Inject(ConfigService) private configService: ConfigService,
        @Inject(SubscriptionCascadeService) private cascade: SubscriptionCascadeService
    ) {
        super(logger)
    }

    @OnEvent(AppEvent.INVITE_CLAIMED, { async: true })
    async handleInviteClaimed(event: unknown): Promise<void> {
        const { accounts, userId } = event as InviteClaimedEvent
        for (const inviteAccount of accounts) {
            try {
                await this.linkAccount(userId, inviteAccount)
            } catch (error) {
                this.logger.error(
                    `Failed to link invite account for service ${inviteAccount.serviceName} to user ${userId}`,
                    { stackTrace: error instanceof Error ? error.stack : undefined }
                )
            }
        }
    }

    private async linkAccount(
        userId: string,
        inviteAccount: InviteClaimedEvent['accounts'][number]
    ): Promise<void> {
        const serviceName = inviteAccount.serviceName as IntegrationProvider

        if (!this.integrationRegistry.has(serviceName)) {
            this.logger.warn(`Service client '${serviceName}' not registered, skipping account link`)
            return
        }

        const client = this.integrationRegistry.get(serviceName)

        if (!client) {
            this.logger.warn(`No account integration for '${serviceName}', skipping account link`)
            return
        }

        const result = await client.getUser({
            username: inviteAccount.username ?? undefined,
            email: inviteAccount.email ?? undefined,
            userServiceAccountId: inviteAccount.accountId ?? undefined,
        })

        if (!result.ok || !result.user) {
            this.logger.log(
                `No existing account found on '${serviceName}' for user '${inviteAccount.username ?? inviteAccount.email ?? inviteAccount.accountId}', skipping link`
            )
            return
        }

        const existing = await this.externalAccountRepository.findMany({
            serviceId: inviteAccount.serviceId,
            externalAccountId: result.user.id,
        })

        if (existing.length > 0) {
            this.logger.log(
                `Account '${result.user.username}' on '${serviceName}' is already linked to user ${existing[0]!.userId}, skipping`
            )
            return
        }

        const { defaultExpiryDays } = this.configService.get(SystemConfigKey.SUBSCRIPTIONS)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + defaultExpiryDays)

        const subscription = await this.subscriptionRepository.create({
            userId,
            serviceId: inviteAccount.serviceId,
            status: SubscriptionStatus.active,
            autoRenew: true,
            expiresAt,
            provisionedAt: new Date(),
        })

        if (!subscription) {
            this.logger.warn(`Failed to create subscription while linking '${serviceName}' for user ${userId}`)
            return
        }

        await this.externalAccountRepository.create({
            subscriptionId: subscription.id,
            userId,
            serviceId: inviteAccount.serviceId,
            username: result.user.username,
            externalAccountId: result.user.id,
        })

        try {
            await this.cascade.onActivated(subscription)
        } catch (error) {
            this.logger.error(
                `Failed to cascade linked '${serviceName}' subscription for user ${userId} to referenced services`,
                { stackTrace: error instanceof Error ? error.stack : undefined }
            )
        }

        this.logger.log(
            `Linked existing '${serviceName}' account '${result.user.username}' to user ${userId}`
        )
    }
}
