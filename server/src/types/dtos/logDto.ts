import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator'
import { LogLevel } from '@/types/enums'

export class LogResponseDto {
    @ApiProperty({ type: Number })
    id: number

    @ApiPropertyOptional({ type: String })
    userId: string | null

    @ApiPropertyOptional({ type: String })
    sessionId: string | null

    @ApiPropertyOptional({ type: String })
    correlationId: string | null

    @ApiProperty({ enum: LogLevel })
    logLevel: string

    @ApiPropertyOptional({ type: String })
    context: string | null

    @ApiProperty({ type: String })
    message: string

    @ApiPropertyOptional({ type: String })
    stackTrace: string | null

    @ApiProperty({ type: Date })
    createdAt: Date
}

export class LogListRequestDto {
    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsUUID()
    userId?: string

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsUUID()
    sessionId?: string

    @ApiPropertyOptional({ enum: LogLevel })
    @IsOptional()
    @IsEnum(LogLevel)
    logLevel?: LogLevel

    @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Only include logs created at or after this time' })
    @IsOptional()
    @IsDateString()
    createdAfter?: string

    @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Only include logs created at or before this time' })
    @IsOptional()
    @IsDateString()
    createdBefore?: string

    @ApiPropertyOptional({ type: String, description: 'Case-insensitive substring search across message, context, and stack trace' })
    @IsOptional()
    @IsString()
    search?: string

    @ApiPropertyOptional({ type: Number, default: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    take?: number

    @ApiPropertyOptional({ type: Number, default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    skip?: number
}
