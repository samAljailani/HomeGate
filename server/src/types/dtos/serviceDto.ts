import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { AccountType, IntegrationProvider } from '@/types/enums'

export class ServiceRequiredInputsDto {
    @ApiProperty({ type: Boolean })
    username: boolean

    @ApiProperty({ type: Boolean })
    password: boolean

    @ApiProperty({ type: Boolean })
    email: boolean

    @ApiProperty({ type: Boolean })
    displayName: boolean
}

export class ServiceParamsDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    slug: string
}
export class ServiceLoadRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number
}

export class ServiceCreateRequestDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    authSchemeId: number
}

export class ServiceUpdateRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number

    @ApiProperty({ type: String, required: false })
    @IsString()
    name?: string

    @ApiProperty({ type: Number, required: false })
    @IsInt()
    authSchemeId?: number
}

export class ServiceDeleteRequestDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number
}

export class ServiceResponseDto {
    @ApiProperty({ type: Number })
    @IsInt()
    @IsNotEmpty()
    id: number

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    slug: string

    @ApiProperty({ type: Boolean })
    enabled: boolean

    @ApiProperty({ enum: AccountType, enumName: 'AccountType' })
    accountType: AccountType

    @ApiProperty({ enum: IntegrationProvider, enumName: 'IntegrationProvider', nullable: true })
    integrationProvider: IntegrationProvider | null

    @ApiProperty({ type: Number, nullable: true, description: 'Service supplying the account for a REFERENCED service' })
    accountSourceServiceId: number | null

    @ApiProperty({ type: Boolean, description: 'Whether all users may subscribe unless overridden' })
    defaultAllowed: boolean

    @ApiPropertyOptional({ type: String, nullable: true })
    url: string | null

    @ApiPropertyOptional({ type: String, nullable: true })
    imageUrl: string | null

    @ApiPropertyOptional({
        type: ServiceRequiredInputsDto,
        description: 'Credentials the signup form must collect; absent when nothing is provisioned',
    })
    requiredInputs?: ServiceRequiredInputsDto
}

export class ServicePatchRequestDto {
    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    url?: string | null

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    imageUrl?: string | null
}

export class ExternalAccountResponseDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    id: string

    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    username: string

    @ApiProperty({ type: Boolean })
    isActive: boolean

    @ApiProperty({ type: Boolean })
    isAdmin: boolean
}
