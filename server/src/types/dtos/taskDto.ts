import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class TaskParamsDto {
    @ApiProperty({ type: String })
    @IsString()
    @IsNotEmpty()
    name: string
}

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
