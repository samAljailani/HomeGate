import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEmail, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator'
import type { InviteModel } from '@/types/models/invite'

export class CreateInviteRequestDto {
    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsEmail()
    email?: string

    @ApiProperty({ type: Number })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    expiresInDays: number

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsUUID()
    createdByUserId?: string
}

export class CreateInviteResponseDto {
    @ApiProperty({ type: String })
    @IsString()
    rawToken: string

    @ApiProperty()
    invite: InviteModel
}

export class ValidateInviteResponseDto {
    @ApiProperty({ type: Boolean })
    valid: boolean
}
