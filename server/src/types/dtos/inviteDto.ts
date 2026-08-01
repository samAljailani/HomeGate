import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type, Transform } from 'class-transformer'
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsUUID, Max, Min } from 'class-validator'
import { MAX_INVITE_EXPIRY_DAYS } from '@/types/invite.constants'

export class InviteParamsDto {
    @ApiProperty({ type: String, format: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    id: string
}

export class CreateInviteRequestDto {
    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsEmail()
    email?: string

    @ApiProperty({ type: Number })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_INVITE_EXPIRY_DAYS)
    expiresInDays: number
}

export class InvitePatchRequestDto {
    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    revoked?: boolean
}

export class InviteResponseDto {
    @ApiProperty({ type: String })
    id: string

    @ApiPropertyOptional({ type: String })
    email: string | null

    @ApiProperty({ type: String })
    expiresAt: Date

    @ApiProperty({ type: String })
    createdAt: Date

    @ApiPropertyOptional({ type: String })
    usedAt: Date | null

    @ApiPropertyOptional({ type: String })
    revokedAt: Date | null

    @ApiPropertyOptional({ type: String })
    revokedReason: string | null

    @ApiPropertyOptional({ type: String })
    createdByUserId: string | null

    @ApiPropertyOptional({ type: String })
    usedByUserId: string | null

    @ApiPropertyOptional({ type: String })
    revokedByUserId: string | null
}

export class CreateInviteResponseDto {
    @ApiProperty({ type: String })
    rawToken: string

    @ApiProperty({ type: InviteResponseDto })
    invite: InviteResponseDto
}
