import { OAuthUserProfileDto } from '@/types/dtos/authDto'
import { OAuthAuthModel } from '@/types/models/oauthAuth'
import { Injectable, Inject, forwardRef, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { UserService } from './user.service'
import { IOAuthProviderRepository } from '@/data/repositories'
import { OAuthProviderModel } from '@/types/models/oauthProvider'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { InviteService } from './invite.service'
import { PrismaProvider } from '@/infrastructure/prisma.provider'

@Injectable()
export class AuthService extends BaseService {
    constructor(
        @Inject(forwardRef(() => UserService)) private userService: UserService,
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(IOAuthProviderRepository) private oauthProviderRepository: IOAuthProviderRepository,
        @Inject(InviteService) private inviteService: InviteService,
        @Inject(PrismaProvider) private db: PrismaProvider
    ) {
        super(logger)
    }

    async authorize(request: OAuthUserProfileDto): Promise<OAuthAuthModel | null> {
        try {
            const user = await this.userService.getUserByEmail(request.email)

            if (user == null) {
                this.logger.log(
                    `Failed Login attempt for non registered user. Provider: ${request.provider}, Email: ${request.email}.`
                )

                return null
            }

            if (user.isDeleted || !user.isEnabled) {
                this.logger.log(`Attempted login for user with email: ${request.email}, provider: ${request.provider}`)

                return null
            }

            const provider = await this.resolveOAuthProvider(request)

            if (provider == null) {
                return null
            }

            const identity = await this.userService.getUserOAuthIdentity(provider.id, request.providerAccountId)

            if (identity == null) {
                const alreadyHasProvider = await this.userService.hasIdentityForProvider(user.id, provider.id)

                if (alreadyHasProvider) {
                    this.logger.log(
                        `Login rejected: user ${user.username} already has an identity for provider ${request.provider} with a different profileId`
                    )
                    return null
                }

                // The user is registered, but has logged in with a new identity provider.
                // Create the identity for this user and provider.
                await this.userService.CreateUserOAuthIdentity({
                    userId: user.id,
                    providerId: provider.id,
                    profileId: request.providerAccountId,
                })
            }

            this.logger.log(`user ${user.username} successfully logged in`)

            return { id: user.id, username: user.username, isAdmin: user.isAdmin, providerId: provider.id }
        } catch (error: unknown) {
            const stackTrace = error instanceof Error ? error.stack : undefined
            this.logger.error(
                `An unhandle error occured while attempting to login user with email: ${request.email}, provider: ${request.provider}`,
                { stackTrace: stackTrace }
            )

            throw error
        }
    }

    async signUp(token: string, request: OAuthUserProfileDto): Promise<OAuthAuthModel> {
        const invite = await this.inviteService.validateToken(token, request.email)

        const existing = await this.userService.getUserByEmail(request.email)

        if (existing != null) {
            this.logger.log(`Sign up attempted with existing email: ${request.email}`)
            throw new BadRequestException('An account with this email already exists.')
        }

        const oauthProvider = await this.resolveOAuthProvider(request)

        if (oauthProvider == null) {
            throw new InternalServerErrorException('OAuth provider is unavailable.')
        }

        const user = await this.db.$transaction(async (tx) => {
            const created = await this.userService.createUserWithOAuthIdentity(
                { email: request.email, firstName: request.firstName ?? '', lastName: request.lastName ?? '' },
                oauthProvider.id,
                request.providerAccountId,
                tx
            )

            await this.inviteService.claimToken(invite.id, created.id, tx)

            return created
        })

        this.logger.log(`User ${user.username} registered via invite ${invite.id}`)

        return { id: user.id, username: user.username, isAdmin: user.isAdmin, providerId: oauthProvider.id }
    }

    async signOut(userId: string | undefined, username?: string | undefined): Promise<void> {
        this.logger.log(`User ${username ?? userId ?? 'unknown'} logged out`)
    }

    private async resolveOAuthProvider(request: OAuthUserProfileDto): Promise<OAuthProviderModel | null> {
        const provider = await this.oauthProviderRepository.findByName(request.provider)

        if (provider == null || !provider.enabled) {
            this.logger.fatal(
                `Attempted login for user with email: ${request.email}, provider: ${request.provider}, yet the provider is not a recognized provider or is disabled.`
            )

            return null
        }

        return provider
    }
}
