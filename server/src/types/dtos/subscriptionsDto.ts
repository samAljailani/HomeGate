import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator'
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
    confirmServicePassword: string

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    autoRenew: boolean
}

export class SubscriptionDeleteRequestDto {
    @ApiProperty({ type: String })
    @Type(() => String)
    @IsString()
    userId: string

    @ApiProperty({ type: Number })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    serviceId: number

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    deleteImmediately?: boolean
}

export class SubscriptionDisableRequestDto {
    @ApiProperty({ type: String })
    @Type(() => String)
    @IsString()
    userId: string

    @ApiProperty({ type: Number })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    serviceId: number
}
