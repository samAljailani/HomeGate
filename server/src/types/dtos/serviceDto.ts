import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class ServiceParamsDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    name: string
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

    @ApiProperty({ type: Boolean })
    enabled: boolean

    @ApiPropertyOptional({ type: String, nullable: true })
    url: string | null
}

export class ServicePatchRequestDto {
    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean
}
