import { Injectable, Inject } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import type { InviteClaimedEvent } from '@/types/events/invite-claimed.event'
import { IUserAccountRepository } from '@/data/repositories'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { ApplicationClientNames, AppEvent, UserAccountStatus } from '@/types/enums'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseService } from './base.service'

@Injectable()
export class InviteAccountLinkingService extends BaseService {
    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(IUserAccountRepository) private userAccountRepository: IUserAccountRepository,
        @Inject(ApplicationClientRegistry) private clientRegistry: ApplicationClientRegistry
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
        const serviceName = inviteAccount.serviceName as ApplicationClientNames

        if (!this.clientRegistry.has(serviceName)) {
            this.logger.warn(`Service client '${serviceName}' not registered, skipping account link`)
            return
        }

        const client = this.clientRegistry.get(serviceName)

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

        await this.userAccountRepository.create({
            userId,
            serviceId: inviteAccount.serviceId,
            username: result.user.username,
            userServiceAccountId: result.user.id,
            status: UserAccountStatus.active,
        })

        this.logger.log(
            `Linked existing '${serviceName}' account '${result.user.username}' to user ${userId}`
        )
    }
}
