import { OAuthUserProfileDto } from '@/types/dtos/authDto'
import { OAuthAuthModel } from '@/types/models/oauthAuth'
import { Injectable, Inject, forwardRef, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { UserService } from './user.service'
import { IOAuthProviderRepository } from '@/data/repositories'
import { OAuthProviderModel } from '@/types/models/oauthProvider'
import { UserStatus } from '@/types/models/user'
import { SIGNUP_COMPLETION_WINDOW_MINUTES } from '@/types/auth.constants'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { EnvRepository } from '@/data/repositories/env.repository'
import { InviteService } from './invite.service'
import { InviteClaimedEvent } from '@/types/events/invite-claimed.event'
import { AppEvent } from '@/types/enums'

/** Context handed back to the controller after an invite sign-up is initiated. */
export type BeginSignUpResult = {
    inviteId: string
    expiresAt: Date
}

@Injectable()
export class AuthService extends BaseService {
    readonly cookieName: string

    constructor(
        @Inject(forwardRef(() => UserService)) private userService: UserService,
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(IOAuthProviderRepository) private oauthProviderRepository: IOAuthProviderRepository,
        @Inject(InviteService) private inviteService: InviteService,
        @Inject(EnvRepository) envRepository: EnvRepository,
        @Inject(EventEmitter2) private eventEmitter: EventEmitter2,
    ) {
        super(logger)
        this.cookieName = envRepository.getEnv().session.cookieName
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

            if (user.status !== UserStatus.ACTIVE) {
                // Only fully active accounts may log in (e.g. provisional PENDING accounts that
                // have not completed the invite sign-up flow, or any future non-active state).
                this.logger.log(
                    `Login rejected for non-active (status=${user.status}) account with email: ${request.email}`
                )

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

            // Keep the avatar fresh — the provider picture can change between sign-ins.
            if (request.picture && request.picture !== user.avatarUrl) {
                await this.userService.updateAvatar(user.id, request.picture)
            }

            this.logger.log(`user ${user.username} successfully logged in`)

            return { id: user.id, username: user.username, isAdmin: user.isAdmin, providerId: provider.id, avatarUrl: request.picture ?? user.avatarUrl ?? null }
        } catch (error: unknown) {
            const stackTrace = error instanceof Error ? error.stack : undefined
            this.logger.error(
                `An unhandle error occured while attempting to login user with email: ${request.email}, provider: ${request.provider}`,
                { stackTrace: stackTrace }
            )

            throw error
        }
    }

    /**
     * Begin an invite sign-up. Validates the invite and, for a bound invite, provisions (or reuses)
     * a PENDING account for the bound email so the identity can be linked on the first successful
     * OAuth sign-in. Returns the context the controller stores in the session for the completion
     * step, including the short window by which sign-in must be completed.
     */
    async beginSignUp(token: string): Promise<BeginSignUpResult> {
        const invite = await this.inviteService.validateToken(token)

        if (invite.email != null) {
            const existing = await this.userService.getUserByEmail(invite.email)

            if (existing != null) {
                this.logger.log(`Sign up attempted for existing account: ${invite.email}`)
                throw new BadRequestException('An account with this email already exists.')
            }
        }

        const expiresAt = new Date(Date.now() + SIGNUP_COMPLETION_WINDOW_MINUTES * 60_000)

        return { inviteId: invite.id, expiresAt }
    }

    /**
     * Complete an invite sign-up from the OAuth callback: re-validate (enforcing the bound-email
     * match), link the OAuth identity, consume the invite, and activate the account. A bound invite
     * activates its pre-provisioned PENDING account; an unbound invite creates the account here.
     */
    async completeSignUp(token: string, profile: OAuthUserProfileDto): Promise<OAuthAuthModel> {
        const invite = await this.inviteService.validateToken(token, profile.email)

        const provider = await this.resolveOAuthProvider(profile)

        if (provider == null) {
            throw new InternalServerErrorException('OAuth provider is unavailable.')
        }

        const existing = await this.userService.getUserByEmail(profile.email)

        if (existing != null) {
            this.logger.log(`Sign up completion attempted for existing account: ${profile.email}`)
            throw new BadRequestException('An account with this email already exists.')
        }

        const inviteOverrides = this.inviteService.getInviteUserOverrides(invite)

        const account = await this.userService.createUser({ email: profile.email, firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', ...inviteOverrides })

        if (account == null || !account.id) {
            throw new InternalServerErrorException('Failed to create user account.')
        }

        await this.userService.CreateUserOAuthIdentity({
            userId: account.id,
            providerId: provider.id,
            profileId: profile.providerAccountId,
        })

        await this.inviteService.claimToken(invite.id, account.id)

        if (invite.accounts.length > 0) {
            this.eventEmitter.emit(
                AppEvent.INVITE_CLAIMED,
                { userId: account.id, accounts: invite.accounts } satisfies InviteClaimedEvent
            )
        }

        this.logger.log(`User ${account.username} registered via invite ${invite.id}`)

        return { id: account.id, username: account.username, isAdmin: account.isAdmin, providerId: provider.id, avatarUrl: profile.picture ?? account.avatarUrl ?? null }
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
