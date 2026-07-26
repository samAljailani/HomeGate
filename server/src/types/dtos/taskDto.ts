import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateTaskConfigDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    enabled?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    runOnStartup?: boolean

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cronExpression?: string
}

export class TaskConfigResponseDto {
    name!: string
    enabled!: boolean
    runOnStartup!: boolean
    cronExpression!: string
    isActive!: boolean
}
