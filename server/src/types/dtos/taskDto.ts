import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class TaskParamsDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    name: string
}

export class UpdateTaskConfigDto {
    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    runOnStartup?: boolean

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    cronExpression?: string
}

export class TaskConfigResponseDto {
    @ApiProperty({ type: String })
    name!: string

    @ApiProperty({ type: Boolean })
    enabled!: boolean

    @ApiProperty({ type: Boolean })
    runOnStartup!: boolean

    @ApiProperty({ type: String })
    cronExpression!: string

    @ApiProperty({ type: Boolean })
    isActive!: boolean

    @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
    lastAttemptedRunAt!: Date | null

    @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
    lastSuccessfulRunAt!: Date | null

    @ApiPropertyOptional({ type: Number, nullable: true, description: 'Duration in milliseconds of the last attempted run' })
    lastRunDurationMs!: number | null
}
