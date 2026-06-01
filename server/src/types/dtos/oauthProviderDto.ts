import { ApiProperty } from '@nestjs/swagger'
import { OAuthProviderName } from '@/types/models/oauthProvider'
import { IsBoolean, IsEnum, IsInt, IsNotEmpty } from 'class-validator'

export class OAuthProviderLoadRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number
}

export class OAuthProviderResponseDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number

    @ApiProperty({ enum: OAuthProviderName })
    @IsEnum(OAuthProviderName)
    @IsNotEmpty()
    name: OAuthProviderName

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    enabled: boolean
}
