import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator'
import { Match } from '@/types/validators/match.validator'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { UserAccountStatus } from '@/types/enums'

export { UserAccountStatus }

export class SubscriptionLoadRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string
}

export class SubscriptionCreateRequestDto {
    @ApiProperty({ type: Number })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    serviceId: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    serviceUsername: string

    @ApiPropertyOptional({ type: String })
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
    autoRenew: boolean
}

export class SubscriptionDeleteQueryDto {
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

export class SubscriptionListQueryDto extends PaginationRequestDto {
    @ApiPropertyOptional({ type: String, description: 'Filter subscriptions by user id' })
    @IsOptional()
    @IsUUID()
    userId?: string
}
