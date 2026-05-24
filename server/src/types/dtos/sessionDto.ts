import { ApiProperty } from '@nestjs/swagger'
import { IsDate, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class SessionLoadRequestDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    sid: string;
}

export class SessionCreateRequestDto {
    @ApiProperty({ type: String, required: false })
    @IsUUID()
    @IsOptional()
    user_id?: string;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    sid: string;

    @ApiProperty({ type: Object })
    @IsNotEmpty()
    data: any;

    @ApiProperty({ type: Date })
    @IsDate()
    @IsNotEmpty()
    expires_at: Date;
}

export class SessionDeleteRequestDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    sid: string;
}

export class SessionFilterOptions {
    user_id?: string;
    sid?: string;
}

export class SessionResponseDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ type: String, required: false })
    @IsUUID()
    @IsOptional()
    user_id?: string;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    sid: string;

    @ApiProperty({ type: Object })
    data: any;

    @ApiProperty({ type: Date })
    expires_at: Date;

    @ApiProperty({ type: Date })
    created_at: Date;
}
