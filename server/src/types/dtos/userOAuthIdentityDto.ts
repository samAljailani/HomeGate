import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class OAuthIdentityCreateRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    provider_id: number;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    profile_id: string;
}

export class OAuthIdentityLoadRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    provider_id: number;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    profile_id: string;
}

export class OAuthIdentityFilterOptions {
    user_id?: string;
    provider_id?: number;
    profile_id?: string;
}

export class OAuthIdentityDeleteRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    provider_id: number;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    profile_id: string;
}

export class OAuthIdentityResponseDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    provider_id: number;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    profile_id: string;

    @ApiProperty({ type: Date })
    created_at: Date;
}
