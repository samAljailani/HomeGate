import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class OAuthIdentityCreateRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    providerId: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    profileId: string
}

export class OAuthIdentityLoadRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    providerId: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    profileId: string
}

export class OAuthIdentityDeleteRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    providerId: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    profileId: string
}

export class OAuthIdentityResponseDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    id: string

    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    providerId: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    profileId: string

    @ApiProperty({ type: Date })
    createdAt: Date
}
