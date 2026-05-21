import { Controller, Get, Request, Inject, Query, UseGuards} from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'
import { AuthService } from '@/services/auth.service'
import { AuthResponseDto, OpenIDUserResponseDto } from '@/types/dtos/authDto'
import { GoogleOAuthGuard } from '@/middleware/google-oauth.guard'
import type { Request as ExpressRequest } from 'express'
import routes from '../types/dtos/routes'

@Controller(routes.auth.basePath)
export class AuthController {
    constructor(@Inject(AuthService) private readonly authService: AuthService) {}

    @Get(routes.auth.subPath.google)
    @UseGuards(GoogleOAuthGuard)
    googleAuth() {
        /*method body never executed due to passport redirect*/
    }

    @Get(routes.auth.subPath.googleRedirect)
    @UseGuards(GoogleOAuthGuard)
    googleAuthRedirect(@Request() req: ExpressRequest) {
        return this.authService.googleLogin(req.user as OpenIDUserResponseDto);
        //TODO: set cookie on success
    }
}