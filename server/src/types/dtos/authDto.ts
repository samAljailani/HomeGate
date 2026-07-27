import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AuthResponseDto {
    @ApiProperty({ description: 'JWT access token' })
    @IsString()
    @IsNotEmpty()
    accessToken: string

    @ApiProperty({ description: 'JWT refresh token' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string
}

export class OpenIDRequestDto {
    @IsString()
    @IsNotEmpty()
    clientID: string

    @IsString()
    @IsNotEmpty()
    clientSecret: string

    @IsString()
    @IsNotEmpty()
    callbackURL: string

    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    scope: string[]

    @IsBoolean()
    pkce?: boolean

    @IsBoolean()
    state?: boolean

    @IsBoolean()
    nonce?: boolean
}

export class OAuthUserProfileDto {
    @IsString()
    @IsNotEmpty()
    providerAccountId: string

    @IsString()
    @IsNotEmpty()
    email: string

    @IsOptional()
    @IsString()
    firstName?: string

    @IsOptional()
    @IsString()
    lastName?: string

    @IsOptional()
    @IsString()
    picture?: string

    @IsString()
    @IsNotEmpty()
    accessToken: string

    @IsString()
    @IsOptional()
    refreshToken: string

    @IsString()
    @IsNotEmpty()
    provider: string
}
