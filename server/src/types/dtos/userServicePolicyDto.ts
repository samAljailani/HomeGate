import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsInt, IsNotEmpty } from 'class-validator'
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
