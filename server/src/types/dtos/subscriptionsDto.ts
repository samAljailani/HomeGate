import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class SubscrptionLoadRequestDto {
    @ApiProperty({ type: String })
    @IsUUID()
    @IsNotEmpty()
    userId: string
}

export class SubscriptionCreateRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    @Min(1)
    serviceId: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    serviceUsername: string

    @ApiProperty({ type: String })
    @IsString()
    email: string | undefined

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    servicePassword: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    confirmServicePassword: string

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    @IsNotEmpty()
    autoRenew: boolean
}

export class SubscriptionDeleteRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    @Min(1)
    serviceId: number

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    @IsOptional()
    deleteImmediately?: boolean
}