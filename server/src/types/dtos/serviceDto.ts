import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { AccountType, IntegrationProvider } from '@/types/enums'
import { EmptyStringToUndefined } from '../../../lib/utils'

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Account types an admin may create; MANAGED needs a built-in integration and is excluded. */
export const CREATABLE_ACCOUNT_TYPES = [AccountType.REFERENCED, AccountType.NONE] as const
export type CreatableAccountType = (typeof CREATABLE_ACCOUNT_TYPES)[number]

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

export class ServicePutRequestDto {
    @ApiProperty({ type: String, maxLength: 64, description: 'URL-safe identifier, e.g. "jellyseerr"' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @Matches(SLUG_PATTERN, {
        message: 'slug must be lowercase alphanumeric words separated by single hyphens',
    })
    slug: string

    @ApiProperty({ type: String, maxLength: 64 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    name: string

    @ApiProperty({
        enum: CREATABLE_ACCOUNT_TYPES,
        enumName: 'CreatableAccountType',
        description: 'MANAGED is rejected: it requires a built-in integration provider',
    })
    @IsIn(CREATABLE_ACCOUNT_TYPES as readonly string[])
    accountType: CreatableAccountType

    @ApiPropertyOptional({
        type: Number,
        nullable: true,
        description: 'Required for REFERENCED; must name a MANAGED service',
    })
    @IsOptional()
    @IsInt()
    accountSourceServiceId?: number | null

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    defaultAllowed?: boolean

    @ApiProperty({ type: String, description: "The service's public base URL" })
    @Transform(EmptyStringToUndefined)
    @IsString()
    @IsNotEmpty()
    url: string

    @ApiPropertyOptional({ type: String, nullable: true })
    @Transform(EmptyStringToUndefined)
    @IsOptional()
    @IsString()
    imageUrl?: string | null
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

    @ApiPropertyOptional({
        type: Boolean,
        description: 'Whether the requesting user is allowed to subscribe; present on list responses',
    })
    allowed?: boolean
}

export class ServicePatchRequestDto {
    @ApiProperty({ type: String, maxLength: 64, description: 'URL-safe identifier, e.g. "jellyseerr"' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @Matches(SLUG_PATTERN, {
        message: 'slug must be lowercase alphanumeric words separated by single hyphens',
    })
    slug: string

    @ApiProperty({ type: Boolean })
    @IsBoolean()
    enabled: boolean

    @ApiProperty({ type: String, description: "The service's public base URL" })
    @Transform(EmptyStringToUndefined)
    @IsString()
    @IsNotEmpty()
    url: string

    @ApiPropertyOptional({ type: String, nullable: true })
    @Transform(EmptyStringToUndefined)
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
