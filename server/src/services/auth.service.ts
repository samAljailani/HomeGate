import { OpenIDUserResponseDto } from '@/types/dtos/authDto'
import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { UserService } from './user.service'
import { IOAuthProviderRepository } from '@/repositories'
import { ApiResponse } from '../../lib/ApiMessaging'
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

    async googleLogin(request: OpenIDUserResponseDto): Promise<ApiResponse<UserResponseDto | null>> {
        let response: ApiResponse<UserResponseDto | null> = {
            success: true,
            messages: [],
        }

        try {
            const user = await this.userService.getUserByEmail(request.email)

            if (user == null) {
                this.logger.log(
                    `Failed Login attempt for non registered user. Provider: ${request.provider}, Email: ${request.email}.`
                )
                response.success = false
                return response
            }

            if (user.isDeleted) {
                this.logger.log(`Attempted login for user with email: ${request.email}, provider: ${request.provider}`)
                response.success = false
                return response
            }

            const provider = await this.oauthProviderRepository.getByName(request.provider)

            if (provider == null || !provider.enabled) {
                this.logger.fatal(
                    `Attempted login for user with email: ${request.email}, provider: ${request.provider}, yet the provider is not a recognized provider or is disabled.`
                )
                response.success = false
                return response
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

            response.success = true
            response.data = user
            this.logger.log(`user ${user.username} successfully logged in`)
        } catch (error: unknown) {
            const stackTrace = error instanceof Error ? error.stack : undefined
            this.logger.error(
                `An unhandle error occured while attempting to login user with email: ${request.email}, provider: ${request.provider}`,
                { stackTrace: stackTrace }
            )

            response.success = false
        }

        return response
    }
}
