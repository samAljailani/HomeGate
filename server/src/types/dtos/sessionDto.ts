import { ApiProperty } from '@nestjs/swagger'
import { IsDate, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class SessionLoadRequestDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    hashed_token: string;
}

export class SessionCreateRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    hashed_token: string;

    @ApiProperty({ type: Date })
    @IsDate()
    @IsNotEmpty()
    expires_at: Date;

    @ApiProperty({ type: String, required: false })
    @IsString()
    @IsOptional()
    oauth_sid?: string;
}

export class SessionDeleteRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    id: string;
}

export class SessionFilterOptions {
    user_id?: string;
    hashed_token?: string;
}

export class SessionResponseDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ type: Date })
    expires_at: Date;

    @ApiProperty({ type: Date })
    created_at: Date;
}
