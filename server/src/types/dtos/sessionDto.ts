import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator'

export class AdminSessionResponseDto {
    @ApiProperty({ type: String })
    id!: string

    @ApiPropertyOptional({ type: String, nullable: true })
    userId!: string | null

    @ApiPropertyOptional({ type: String, nullable: true })
    username!: string | null

    @ApiPropertyOptional({ type: String, nullable: true })
    provider!: string | null

    @ApiPropertyOptional({ type: String, nullable: true })
    ipAddress!: string | null

    @ApiPropertyOptional({ type: String, nullable: true })
    device!: string | null

    @ApiPropertyOptional({ type: String, nullable: true })
    browser!: string | null

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt!: Date

    @ApiProperty({ type: String, format: 'date-time' })
    expiresAt!: Date
}

export class SessionParamsDto {
    @ApiProperty({ type: String, format: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    id!: string
}

export class SessionConfigResponseDto {
    @ApiProperty({ type: Number, description: 'Maximum concurrent sessions allowed per user; oldest are evicted at login' })
    maxPerUser!: number
}

export class UpdateSessionConfigDto {
    @ApiProperty({ type: Number, minimum: 1, maximum: 100 })
    @IsInt()
    @Min(1)
    @Max(100)
    maxPerUser!: number
}
