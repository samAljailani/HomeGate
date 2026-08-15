import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type, Transform } from 'class-transformer'
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator'
import { MAX_INVITE_EXPIRY_DAYS } from '@/types/invite.constants'
import { AtLeastOneField } from '@/decorators'

export class InviteParamsDto {
    @ApiProperty({ type: String, format: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    id: string
}

export class InviteAccountDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    serviceName: string

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    @AtLeastOneField(['username', 'email', 'accountId'])
    username?: string

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsEmail()
    email?: string

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    accountId?: string
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

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isAdmin?: boolean

    @ApiPropertyOptional({ type: [InviteAccountDto] })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => InviteAccountDto)
    accounts?: InviteAccountDto[]
}

export class InvitePatchRequestDto {
    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    revoked?: boolean

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsEmail()
    email?: string

    @ApiPropertyOptional({ type: String, format: 'date-time' })
    @IsOptional()
    @Type(() => Date)
    expiresAt?: Date

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isAdmin?: boolean
}

export class InviteAccountResponseDto {
    @ApiProperty({ type: String })
    serviceName: string

    @ApiPropertyOptional({ type: String })
    username: string | null

    @ApiPropertyOptional({ type: String })
    email: string | null

    @ApiPropertyOptional({ type: String })
    accountId: string | null
}

export class InviteResponseDto {
    @ApiProperty({ type: String })
    id: string

    @ApiPropertyOptional({ type: String })
    email: string | null

    @ApiProperty({ type: Boolean })
    isAdmin: boolean

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

    @ApiPropertyOptional({ type: [InviteAccountResponseDto] })
    accounts: InviteAccountResponseDto[]
}

export class CreateInviteResponseDto {
    @ApiProperty({ type: String })
    rawToken: string

    @ApiProperty({ type: InviteResponseDto })
    invite: InviteResponseDto
}
