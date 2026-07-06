import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator'
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

    @ApiPropertyOptional({ enum: LogLevel })
    @IsOptional()
    @IsEnum(LogLevel)
    logLevel?: LogLevel

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
