import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator'
import { PolicyEffect } from '@/types/enums'

const POLICY_EFFECTS = [PolicyEffect.ALLOW, PolicyEffect.DENY] as const

export class UserServicePolicySetRequestDto {
    @ApiProperty({ type: Number, description: 'Target service ID' })
    @IsInt()
    @IsNotEmpty()
    serviceId: number

    @ApiProperty({ enum: POLICY_EFFECTS, enumName: 'PolicyEffect' })
    @IsIn(POLICY_EFFECTS as readonly string[])
    effect: PolicyEffect

    @ApiPropertyOptional({
        type: Number,
        description: "Maximum number of external accounts a subscription to this service may be linked to (defaults to 1)",
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    accountsPerService?: number
}

export class UserServicePolicyResponseDto {
    @ApiProperty({ type: String, format: 'uuid' })
    id: string

    @ApiProperty({ type: String, format: 'uuid' })
    userId: string

    @ApiProperty({ type: Number })
    serviceId: number

    @ApiProperty({ type: String })
    serviceName: string

    @ApiProperty({ type: String })
    serviceSlug: string

    @ApiProperty({ enum: POLICY_EFFECTS, enumName: 'PolicyEffect' })
    effect: PolicyEffect

    @ApiProperty({ type: Number, description: "Maximum accounts a subscription to this service may be linked to" })
    accountsPerService: number

    @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
    createdByUserId: string | null

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt: string
}

export class PolicyServiceParamsDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    serviceId: number
}
