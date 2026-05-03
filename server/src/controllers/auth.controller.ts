import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiQuery } from '@nestjs/swagger'
import { AuthService } from '@/services/auth.service'
import { AuthResponseDto, OpenIDRequestDto } from '@/dtos/authDto'

@Controller('auth')
export class AuthController {
    constructor(@Inject(AuthService) private readonly authService: AuthService) {}

    @Get('openid/callback')
    @ApiQuery({ name: 'code', description: 'Authorization code returned by the OpenID provider' })
    @ApiQuery({ name: 'state', description: 'State parameter for CSRF protection' })
    GetOpenIdCallback(@Query() query: OpenIDRequestDto): AuthResponseDto {
        console.log('Received OpenID callback with query:', query);
        return this.authService.OpenIdCallback(query);
    }
}