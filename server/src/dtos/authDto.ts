import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AuthResponseDto {
    @ApiProperty({ description: 'JWT access token' })
    @IsString()
    @IsNotEmpty()
    accessToken: string;

    @ApiProperty({ description: 'JWT refresh token' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class OpenIDRequestDto {
    @ApiProperty({ description: 'Authorization code returned by the OpenID provider' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ description: 'State parameter for CSRF protection' })
    @IsString()
    @IsNotEmpty()
    state: string;
}