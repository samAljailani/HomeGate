import { Controller, Get, Request, Inject, Query, UseGuards} from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'
import { AuthService } from '@/services/auth.service'
import { AuthResponseDto, OpenIDRequestDto } from '@/dtos/authDto'
import { GoogleOAuthGuard } from '@/middleware/google-oauth.guard'
import type { Request as ExpressRequest } from 'express'

@Controller('api/auth')
export class AuthController {
    constructor(@Inject(AuthService) private readonly authService: AuthService) {}

    @Get('google')
    @UseGuards(GoogleOAuthGuard)
    googleAuth() {
        console.log("in googleAuth endpoint")
    }

    @Get('google/callback')
    @UseGuards(GoogleOAuthGuard)
    googleAuthRedirect(@Request() req: ExpressRequest) {
        return {success: true} 
        //return this.authService.googleLogin(req);
    }
}