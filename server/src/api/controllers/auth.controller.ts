import { Controller, Post, Get, Request, Inject, Res, UseGuards, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { AuthService } from '@/api/services/auth.service'
import { OAuthProviderManagementService } from '@/api/services/oauthProviderManagement.service'
import { SessionService } from '@/api/services/session.service'
import { OAuthUserProfileDto, SessionResponseDto } from '@/types/dtos/authDto'
import { GoogleOAuthGuard } from '@/api/middleware/google-oauth.guard'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { routes } from '../../types/dtos/routes'
import { clientRoutes } from './client-routes'
import { Public } from '@/decorators'
import { Throttle } from '@nestjs/throttler'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Controller(routes.auth.basePath)
export class AuthController {
    constructor(
        @Inject(AuthService) private readonly authService: AuthService,
        @Inject(OAuthProviderManagementService) private readonly oauthProviderManagementService: OAuthProviderManagementService,
        @Inject(SessionService) private readonly sessionService: SessionService,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider,
    ) {
        this.logger.setContext(AuthController.name)
    }

    @Public()
    @Get(routes.auth.subPath.providers)
    @Throttle({ default: { ttl: 60_000, limit: 30 } })
    @ApiOperation({ summary: 'List enabled OAuth providers available for sign-in' })
    @ApiOkResponse({ type: [String] })
    async getEnabledProviders(): Promise<string[]> {
        return this.oauthProviderManagementService.listEnabledNames()
    }

    @Get(routes.auth.subPath.session)
    @Throttle({ default: { ttl: 60_000, limit: 30 } })
    @ApiOperation({ summary: "Get the current session's user identity" })
    @ApiOkResponse({ type: SessionResponseDto })
    getSession(@Request() req: ExpressRequest): SessionResponseDto {
        return {
            id: req.session.userId!,
            username: req.session.username!,
            isAdmin: req.session.isAdmin ?? false,
            avatarUrl: req.session.avatarUrl ?? null,
        }
    }

    @Public()
    @Get(routes.auth.subPath.google)
    @UseGuards(GoogleOAuthGuard)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    googleAuth() {
        /*method body never executed due to passport redirect*/
    }

    @Public()
    @Get(routes.auth.subPath.join)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Begin OAuth sign-up flow via invite token' })
    @ApiQuery({ name: 'token', type: String, required: true, description: 'Raw invite token from the invite link' })
    async join(@Query('token') token: string, @Request() req: ExpressRequest, @Res() res: ExpressResponse) {
        if (!token) {
            this.logger.debug('join: called without a token')
            return res.redirect(`${clientRoutes.signIn}?error=missing_token`)
        }

        try {
            const { inviteId, expiresAt } = await this.authService.beginSignUp(token)

            this.logger.debug(`join: beginSignUp OK, inviteId=${inviteId}, window expires ${expiresAt.toISOString()}`)

            await new Promise<void>((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) return reject(err)

                    req.session.oauthTransaction = {
                        inviteToken: token,
                        inviteId,
                        expiresAt,
                    }

                    req.session.save((err) => (err ? reject(err) : resolve()))
                })
            })

            this.logger.debug(`join: oauthTransaction saved to session ${req.session.id}`)

            return res.redirect(clientRoutes.signIn)
        } catch (error) {
            this.logger.warn(`join: failed — ${error instanceof Error ? error.message : String(error)}`)
            return res.redirect(`${clientRoutes.signIn}?error=invalid_invite`)
        }
    }

    @Public()
    @Get(routes.auth.subPath.googleRedirect)
    @UseGuards(GoogleOAuthGuard)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    async googleAuthRedirect(@Request() req: ExpressRequest, @Res() res: ExpressResponse) {
        return this.handleOAuthRedirect(req, res)
        //TODO: remove invite token from session.
    }

    @Post(routes.auth.subPath.signOut)
    async logout(@Request() req: ExpressRequest, @Res() res: ExpressResponse) {
        const userId = req.session.userId
        const username = req.session.username

        try {
            await this.authService.signOut(userId, username)
            await new Promise<void>((resolve) => req.session.destroy(() => resolve()))
            res.clearCookie(this.authService.cookieName)
        } catch (error) {
            this.logger.error(`Failed to sign out user ${userId ?? 'unknown'}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
        }

        return res.status(204).send()
    }

    private async handleOAuthRedirect(req: ExpressRequest, res: ExpressResponse) {
        const body = req.user as OAuthUserProfileDto
        const transaction = req.session.oauthTransaction
        const pendingReturnUrl = this.safeReturnUrl(req.session.returnUrl)
        delete req.session.returnUrl

        this.logger.debug(
            `oauth callback: session=${req.session.id}, hasTransaction=${transaction != null}${transaction ? `, inviteId=${transaction.inviteId}` : ''}, email=${body?.email}`
        )

        if (transaction && new Date(transaction.expiresAt) < new Date()) {
            delete req.session.oauthTransaction
            this.logger.log('Invite sign-up window expired before OAuth completion')
            return res.redirect(`${clientRoutes.signIn}?error=invite_expired`)
        }

        let response
        try {
            if (transaction) {
                this.logger.debug(`oauth callback: completing invite sign-up for invite ${transaction.inviteId}`)
                response = await this.authService.completeSignUp(transaction.inviteToken, body)
                delete req.session.oauthTransaction
            } else {
                this.logger.debug('oauth callback: no transaction, treating as plain sign-in')
                response = await this.authService.authorize(body)
            }
        } catch (error) {
            delete req.session.oauthTransaction
            this.logger.error('OAuth callback failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            return res.redirect(`${clientRoutes.signIn}?error=auth_failed`)
        }

        if (!response || response.id === '' || response.id == null) {
            return res.redirect(`${clientRoutes.signIn}?error=auth_failed`)
        }

        try {
            await this.sessionService.enforceLimitForUser(response.id)
        } catch (error) {
            // Eviction failure must not block login.
            this.logger.error('Failed to enforce session limit', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
        }

        try {
            await new Promise<void>((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) return reject(err)

                    req.session.userId = response.id
                    req.session.username = response.username
                    req.session.isAdmin = response.isAdmin
                    req.session.authProviderId = response.providerId
                    if (response.avatarUrl != null) {
                        req.session.avatarUrl = response.avatarUrl
                    }

                    req.session.save((err) => {
                        if (err) return reject(err)

                        resolve()
                    })
                })
            })

            return res.redirect(pendingReturnUrl ?? clientRoutes.home)
        } catch (error) {
            this.logger.error('Session regeneration or save failed after OAuth login', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            return res.redirect(`${clientRoutes.signIn}?error=session_failed`)
        }
    }

    /** Only http(s) absolute URLs are allowed as post-login targets; these are written by forward auth after the hostname resolved to a registered service. */
    private safeReturnUrl(value: string | undefined): string | null {
        if (!value) return null

        try {
            const target = new URL(value)
            if (target.protocol !== 'https:' && target.protocol !== 'http:') return null
            return target.toString()
        } catch {
            return null
        }
    }
}
