import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class UserAccountLoadRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    service_id: number;
}

export class UserAccountCreateRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    service_id: number;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    username: string;
}

export class UserAccountUpdateRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    service_id: number;

    @ApiProperty({ type: String, required: false })
    @IsString()
    username?: string;

    @ApiProperty({ type: Boolean, required: false })
    @IsBoolean()
    is_active?: boolean;
}

export class UserAccountDeleteRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    service_id: number;
}

export class UserAccountFilterOptions {
    user_id?: string;
    service_id?: number;
    is_active?: boolean;
}

export class UserAccountResponseDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    user_id: string;

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    service_id: number;

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    is_active: boolean;

    @ApiProperty({ type: Date })
    created_at: Date;
}
