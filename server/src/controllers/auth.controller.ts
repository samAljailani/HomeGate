import { Controller, Post, Get, Request, Inject, Res, UseGuards } from '@nestjs/common'
import { AuthService } from '@/services/auth.service'
import { OpenIDUserResponseDto } from '@/types/dtos/authDto'
import { GoogleOAuthGuard } from '@/middleware/google-oauth.guard'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { routes, clientRoutes } from '../types/dtos/routes'
import { Public } from '@/decorators'
import { Throttle } from '@nestjs/throttler'

@Controller(routes.auth.basePath)
export class AuthController {
    constructor(@Inject(AuthService) private readonly authService: AuthService) {}

    @Public()
    @Get(routes.auth.subPath.google)
    @UseGuards(GoogleOAuthGuard)
    @Throttle({ short: { ttl: 60_000, limit: 10 } })
    googleAuth() {
        /*method body never executed due to passport redirect*/
    }

    @Public()
    @Get(routes.auth.subPath.googleRedirect)
    @UseGuards(GoogleOAuthGuard)
    @Throttle({ short: { ttl: 60_000, limit: 10 } })
    async googleAuthRedirect(@Request() req: ExpressRequest, @Res() res: ExpressResponse) {
        const body = req.user as OpenIDUserResponseDto

        const response = await this.authService.googleLogin(body)
        if (!response.success || !response.data) {
            return res.redirect(`${clientRoutes.signIn}?error=auth_failed`)
        }

        try {
            await new Promise<void>((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) return reject(err)

                    req.session.userId = response.data!.id
                    req.session.username = response.data!.username
                    req.session.isAdmin = response.data!.isAdmin

                    req.session.save((err) => {
                        if (err) return reject(err)

                        resolve()
                    })
                })
            })

            return res.redirect(clientRoutes.home)
        } catch (error) {
            response.success = false
            response.data = null
            return res.redirect(`${clientRoutes.signIn}?error=session_failed`)
        }
    }

    @Post(routes.auth.subPath.signOut)
    async logout(@Request() req: ExpressRequest, @Res() res: ExpressResponse) {
        const userId = req.session.userId
        const username = req.session.username

        await this.authService.signOut(userId, username)

        await new Promise<void>((resolve) => req.session.destroy(() => resolve()))

        return res.redirect(clientRoutes.signIn)
    }
}
