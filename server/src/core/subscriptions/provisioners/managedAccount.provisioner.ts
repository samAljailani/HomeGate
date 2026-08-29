import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    InternalServerErrorException,
    ServiceUnavailableException,
} from '@nestjs/common'
import { AccountType } from '@/types/enums'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { IAccountIntegrationProvider } from '@/core/integrations/IAccountIntegrationProvider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ServiceModel } from '@/types/models/service'
import { ApplicationUserModel } from '@/types/params/accountIntegration'
import {
    ExternalAccountStatus,
    ISubscriptionProvisioner,
    LifecycleContext,
    ProvisionContext,
    ProvisionResult,
} from './ISubscriptionProvisioner'

/**
 * The only provisioner that talks to a vendor integration. Owns account creation, deletion,
 * enable/disable and password reset for services HomeGate provisions accounts for.
 */
@Injectable()
export class ManagedAccountProvisioner implements ISubscriptionProvisioner {
    readonly accountType = AccountType.MANAGED

    constructor(
        @Inject(AccountIntegrationRegistry) private readonly registry: AccountIntegrationRegistry,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
    }

    private resolveProvider(service: ServiceModel): IAccountIntegrationProvider {
        const provider = this.registry.get(service.integrationProvider)

        if (!provider) {
            throw new BadRequestException(`No account integration is available for service '${service.name}'`)
        }

        return provider
    }

    async validate(ctx: ProvisionContext): Promise<void> {
        const provider = this.resolveProvider(ctx.service)
        const { requiredInputs } = provider

        if (requiredInputs.email && ctx.request.email?.toLowerCase() !== ctx.user.email.toLowerCase()) {
            throw new BadRequestException(
                "Email address must match the user's HomeGate account email address"
            )
        }

        if (requiredInputs.username && !ctx.request.username) {
            throw new BadRequestException(`A username is required to subscribe to '${ctx.service.name}'`)
        }

        if (requiredInputs.password && !ctx.request.password) {
            throw new BadRequestException(`A password is required to subscribe to '${ctx.service.name}'`)
        }

        // Probe once here; provision() reuses the result rather than calling the vendor again.
        ctx.reusableAccount = await this.findReusableAccount(ctx, provider)

        if (ctx.reusableAccount) {
            return
        }

        try {
            const existing = await provider.getUser({
                username: ctx.request.username,
                email: ctx.request.email,
                userServiceAccountId: undefined,
            })

            if (existing.ok || existing.user) {
                throw new ConflictException('Service account already exists')
            }
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error
            }

            this.logger.error(`Failed to check account availability for service '${ctx.service.name}'`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            throw new ServiceUnavailableException('Failed to verify service account availability')
        }
    }

    private async findReusableAccount(
        ctx: ProvisionContext,
        provider: IAccountIntegrationProvider
    ): Promise<ApplicationUserModel | null> {
        const previous = ctx.existingAccount

        if (!previous?.externalAccountId) {
            return null
        }

        const result = await provider.getUser({
            userServiceAccountId: previous.externalAccountId,
            username: previous.username ?? undefined,
            email: undefined,
        })

        return result.ok ? result.user : null
    }

    async provision(ctx: ProvisionContext): Promise<ProvisionResult> {
        const provider = this.resolveProvider(ctx.service)

        // Re-enable the surviving vendor account rather than creating a duplicate.
        if (ctx.reusableAccount) {
            const enabled = await provider.enableUser({
                userServiceAccountId: ctx.reusableAccount.id,
                username: ctx.reusableAccount.username,
                email: ctx.user.email,
            })

            if (!enabled) {
                throw new ServiceUnavailableException('Failed to re-enable existing service account')
            }

            this.logger.log(
                `Reused existing '${ctx.service.name}' account '${ctx.reusableAccount.username}' ` +
                    `for user '${ctx.user.userId}'`
            )

            return {
                account: {
                    externalAccountId: ctx.reusableAccount.id,
                    username: ctx.reusableAccount.username,
                    email: ctx.request.email ?? null,
                },
            }
        }

        const created = await provider.createUser({
            username: ctx.request.username!,
            password: ctx.request.password!,
            email: ctx.request.email,
            displayName: ctx.request.username!,
        })

        if (!created.ok || !created.user) {
            // The vendor may have created the account despite an invalid response; a retry will
            // surface it as a ConflictException from validate().
            this.logger.error(
                `Integration for '${ctx.service.name}' returned an invalid response after createUser. ` +
                    `An orphaned external account may exist for username '${ctx.request.username}'.`
            )
            throw new InternalServerErrorException('The account integration did not return a valid response')
        }

        return {
            account: {
                externalAccountId: created.user.id,
                username: created.user.username,
                email: ctx.request.email ?? null,
            },
        }
    }

    async deprovision(ctx: LifecycleContext): Promise<void> {
        const provider = this.resolveProvider(ctx.service)

        const deleted = await provider.deleteUser({
            userServiceAccountId: ctx.account?.externalAccountId ?? undefined,
            username: ctx.account?.username ?? undefined,
            email: ctx.user.email,
        })

        if (!deleted) {
            throw new ServiceUnavailableException(
                `Failed to delete the external account for user '${ctx.user.userId}' on service '${ctx.service.id}'`
            )
        }
    }

    async disable(ctx: LifecycleContext): Promise<void> {
        const provider = this.resolveProvider(ctx.service)

        const disabled = await provider.disableUser({
            userServiceAccountId: ctx.account?.externalAccountId ?? undefined,
            username: ctx.account?.username ?? undefined,
            email: ctx.user.email,
        })

        if (!disabled) {
            throw new ServiceUnavailableException(
                `Failed to disable the external account for user '${ctx.user.userId}' on service '${ctx.service.id}'`
            )
        }
    }

    async enable(ctx: LifecycleContext): Promise<void> {
        const provider = this.resolveProvider(ctx.service)

        const enabled = await provider.enableUser({
            userServiceAccountId: ctx.account?.externalAccountId ?? undefined,
            username: ctx.account?.username ?? undefined,
            email: ctx.user.email,
        })

        if (!enabled) {
            throw new ServiceUnavailableException(
                `Failed to enable the external account for user '${ctx.user.userId}' on service '${ctx.service.id}'`
            )
        }
    }

    async resetPassword(ctx: LifecycleContext, newPassword: string): Promise<void> {
        const provider = this.resolveProvider(ctx.service)

        if (!ctx.account?.externalAccountId) {
            throw new BadRequestException('Service account is not provisioned yet')
        }

        const ok = await provider.resetPassword(
            {
                userServiceAccountId: ctx.account.externalAccountId,
                username: ctx.account.username ?? undefined,
                email: undefined,
            },
            newPassword
        )

        if (!ok) {
            throw new ServiceUnavailableException('Failed to reset the service account password')
        }
    }

    async getExternalAccountStatus(ctx: LifecycleContext): Promise<ExternalAccountStatus> {
        const provider = this.registry.get(ctx.service.integrationProvider)

        if (!provider || !ctx.account) {
            return 'missing'
        }

        const result = await provider.getUser({
            userServiceAccountId: ctx.account.externalAccountId ?? undefined,
            username: ctx.account.username ?? undefined,
            email: undefined,
        })

        if (!result.ok || !result.user) {
            return 'missing'
        }

        return result.user.isActive ? 'active' : 'inactive'
    }
}
