import { Controller, Post, Get, Request, Inject, Res, UseGuards, Query } from '@nestjs/common'
import { AuthService } from '@/api/services/auth.service'
import { InviteService } from '@/api/services/invite.service'
import { OAuthUserProfileDto } from '@/types/dtos/authDto'
import { GoogleOAuthGuard } from '@/api/middleware/google-oauth.guard'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { routes, clientRoutes } from '../../types/dtos/routes'
import { Public } from '@/decorators'
import { Throttle } from '@nestjs/throttler'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Controller(routes.auth.basePath)
export class AuthController {
    constructor(
        @Inject(AuthService) private readonly authService: AuthService,
        @Inject(InviteService) private readonly inviteService: InviteService,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(AuthController.name)
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
    async join(@Query('token') token: string, @Request() req: ExpressRequest, @Res() res: ExpressResponse) {
        if (!token) {
            return res.redirect(`${clientRoutes.signIn}?error=missing_token`)
        }

        try {
            const invite = await this.inviteService.validateToken(token)

            await new Promise<void>((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) return reject(err)

                    req.session.oauthTransaction = {
                        inviteToken: token,
                        inviteId: invite.id,
                        expiresAt: invite.expiresAt,
                    }

                    req.session.save((err) => (err ? reject(err) : resolve()))
                })
            })

            return res.redirect(routes.auth.google)
        } catch {
            return res.redirect(`${clientRoutes.signIn}?error=invalid_invite`)
        }
    }

    @Public()
    @Get(routes.auth.subPath.googleRedirect)
    @UseGuards(GoogleOAuthGuard)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    async googleAuthRedirect(@Request() req: ExpressRequest, @Res() res: ExpressResponse) {
        return this.handleOAuthRedirect(req, res)
    }

    @Post(routes.auth.subPath.signOut)
    async logout(@Request() req: ExpressRequest, @Res() res: ExpressResponse) {
        const userId = req.session.userId
        const username = req.session.username

        try {
            await this.authService.signOut(userId, username)
            await new Promise<void>((resolve) => req.session.destroy(() => resolve()))
        } catch (error) {
            this.logger.error(`Failed to sign out user ${userId ?? 'unknown'}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
        }

        return res.redirect(clientRoutes.signIn)
    }

    private async handleOAuthRedirect(req: ExpressRequest, res: ExpressResponse) {
        const body = req.user as OAuthUserProfileDto
        const transaction = req.session.oauthTransaction

        let response
        try {
            response = transaction
                ? await this.authService.signUp(transaction.inviteToken, body)
                : await this.authService.authorize(body)
        } catch (error) {
            this.logger.error('OAuth callback failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            return res.redirect(`${clientRoutes.signIn}?error=auth_failed`)
        }

        if (!response || response.id === '' || response.id == null) {
            return res.redirect(`${clientRoutes.signIn}?error=auth_failed`)
        }

        try {
            await new Promise<void>((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) return reject(err)

                    req.session.userId = response.id
                    req.session.username = response.username
                    req.session.isAdmin = response.isAdmin

                    req.session.save((err) => {
                        if (err) return reject(err)

                        resolve()
                    })
                })
            })

            return res.redirect(clientRoutes.home)
        } catch (error) {
            this.logger.error('Session regeneration or save failed after OAuth login', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            return res.redirect(`${clientRoutes.signIn}?error=session_failed`)
        }
    }
}
