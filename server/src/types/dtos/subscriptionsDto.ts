import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator'
import { Match } from '@/types/validators/match.validator'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { AccountType, SubscriptionStatus } from '@/types/enums'
import { EmptyStringToUndefined } from '../../../lib/utils'

export { SubscriptionStatus as UserAccountStatus }

export class SubscriptionResponseDto {
    @ApiProperty({ type: String, format: 'uuid' })
    id: string

    @ApiProperty({ type: String, format: 'uuid' })
    userId: string

    @ApiProperty({ type: Number })
    serviceId: number

    @ApiProperty({ type: String, nullable: true, description: 'External account username; null when the service has no account' })
    username: string | null

    @ApiProperty({ enum: SubscriptionStatus })
    status: SubscriptionStatus

    @ApiProperty({ type: Boolean })
    autoRenew: boolean

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt: Date

    @ApiProperty({ type: String, format: 'date-time' })
    updatedAt: Date

    @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
    expiresAt: Date | null

    @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
    provisionedAt: Date | null

    @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
    cancelledAt: Date | null

    @ApiProperty({
        enum: AccountType,
        enumName: 'AccountType',
        description: "The subscribed-to service's account type",
    })
    accountType: AccountType

    @ApiProperty({ type: String, format: 'uuid', nullable: true, description: 'Source subscription that auto-created this one (REFERENCED services)' })
    derivedFromSubscriptionId: string | null

    @ApiPropertyOptional({ type: String, description: 'The subscribing user\'s HomeGate username (admin listings only)' })
    userUsername?: string

    @ApiPropertyOptional({ type: String, description: 'The subscribing user\'s email (admin listings only)' })
    userEmail?: string

    @ApiPropertyOptional({ type: String, description: 'The subscribed-to service\'s display name (admin listings only)' })
    serviceName?: string

    @ApiPropertyOptional({ type: String, description: 'The subscribed-to service\'s slug (admin listings only)' })
    serviceSlug?: string
}

export class SubscriptionParamsDto {
    @ApiProperty({ type: String, format: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    id: string
}

export class SubscriptionCreateRequestDto {
    @ApiProperty({ type: Number })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    serviceId: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    serviceUsername: string

    @ApiPropertyOptional({ type: String })
    @Transform(EmptyStringToUndefined)
    @IsOptional()
    @IsEmail()
    email?: string

    @ApiProperty({ type: String, writeOnly: true })
    @IsString()
    @IsNotEmpty()
    servicePassword: string

    @ApiProperty({ type: String, writeOnly: true })
    @IsString()
    @IsNotEmpty()
    @Match('servicePassword', { message: 'Passwords do not match' })
    confirmServicePassword: string

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    @IsNotEmpty()
    autoRenew: boolean
}

export class SubscriptionDeleteRequestDto {
    @ApiPropertyOptional({
        type: Boolean,
        description: 'Immediately delete the external account instead of cancelling auto-renew',
    })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    immediate?: boolean
}

export class SubscriptionPatchRequestDto {
    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    autoRenew?: boolean
}

export class SubscriptionAutoRenewDto {
    @ApiProperty({ type: Boolean })
    @IsBoolean()
    autoRenew!: boolean
}

export class SubscriptionPasswordResetDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    newPassword!: string

    @ApiProperty({ type: String })
    @IsString()
    @Match('newPassword', { message: 'Passwords do not match' })
    confirmPassword!: string
}

export class SubscriptionListRequestDto extends PaginationRequestDto {
    @ApiPropertyOptional({ type: String, description: 'Filter subscriptions by user id' })
    @IsOptional()
    @IsUUID()
    userId?: string
}
