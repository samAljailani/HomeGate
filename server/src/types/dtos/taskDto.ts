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
}
