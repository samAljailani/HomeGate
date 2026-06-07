import { OAuthUserProfileDto } from '@/types/dtos/authDto'
import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { UserService } from './user.service'
import { IOAuthProviderRepository } from '@/data/repositories'
import { UserResponseDto } from '@/types/dtos/userDto'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Injectable()
export class AuthService extends BaseService {
    constructor(
        @Inject(forwardRef(() => UserService)) private userService: UserService,
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(IOAuthProviderRepository) private oauthProviderRepository: IOAuthProviderRepository
    ) {
        super(logger)
    }

    async authorize(request: OAuthUserProfileDto): Promise<UserResponseDto | null> {
        try {
            const user = await this.userService.getUserByEmail(request.email)

            if (user == null) {
                this.logger.log(
                    `Failed Login attempt for non registered user. Provider: ${request.provider}, Email: ${request.email}.`
                )

                return null
            }

            if (user.isDeleted) {
                this.logger.log(`Attempted login for user with email: ${request.email}, provider: ${request.provider}`)

                return null
            }

            const provider = await this.oauthProviderRepository.findByName(request.provider)

            if (provider == null || !provider.enabled) {
                this.logger.fatal(
                    `Attempted login for user with email: ${request.email}, provider: ${request.provider}, yet the provider is not a recognized provider or is disabled.`
                )

                return null
            }

            const identity = await this.userService.getUserOAuthIdentity(provider.id, request.providerAccountId)

            if (identity == null && provider) {
                // The user is registered, but has logged in with a new identity provider.
                // Create the identity for this user and provider.
                await this.userService.CreateUserOAuthIdentity({
                    userId: user.id,
                    providerId: provider.id,
                    profileId: request.providerAccountId,
                })
            }

            this.logger.log(`user ${user.username} successfully logged in`)

            return user
        } catch (error: unknown) {
            const stackTrace = error instanceof Error ? error.stack : undefined
            this.logger.error(
                `An unhandle error occured while attempting to login user with email: ${request.email}, provider: ${request.provider}`,
                { stackTrace: stackTrace }
            )
        }

        return null
    }

    async signOut(userId: string | undefined, username?: string | undefined): Promise<void> {
        this.logger.log(`User ${username ?? userId ?? 'unknown'} logged out`)
    }
}
