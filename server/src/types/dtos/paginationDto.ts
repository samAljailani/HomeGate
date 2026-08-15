import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, Min } from 'class-validator'

export class PaginationRequestDto {
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

export class PaginatedResponseDto<T> {
    @ApiProperty()
    data: T[]

    @ApiProperty()
    total: number

    @ApiProperty()
    hasMore: boolean

    constructor(data: T[], total: number, take: number, skip: number) {
        this.data = data
        this.total = total
        this.hasMore = skip + data.length < total
    }
}
