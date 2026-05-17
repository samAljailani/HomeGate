import { Controller, Get, Request, Inject, Query, UseGuards} from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'
import { AuthService } from '@/services/auth.service'
import { AuthResponseDto, OpenIDRequestDto } from '@/dtos/authDto'
import { GoogleOAuthGuard } from '@/middleware/google-oauth.guard'
import type { Request as ExpressRequest } from 'express'
import routes from '@/dtos/routes'

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
        return {success: true} 
        return this.authService.googleLogin(req);
    }
}