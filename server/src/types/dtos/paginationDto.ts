import { ApiPropertyOptional, ApiOkResponse, getSchemaPath, ApiExtraModels } from '@nestjs/swagger'
import { Type as TransformType } from 'class-transformer'
import { IsInt, IsOptional, Min } from 'class-validator'
import { applyDecorators, Type } from '@nestjs/common'

export class PaginationRequestDto {
    @ApiPropertyOptional({ type: Number, default: 50 })
    @IsOptional()
    @TransformType(() => Number)
    @IsInt()
    @Min(1)
    take?: number

    @ApiPropertyOptional({ type: Number, default: 0 })
    @IsOptional()
    @TransformType(() => Number)
    @IsInt()
    @Min(0)
    skip?: number
}

export class PaginatedResponseDto<T> {
    data: T[]
    total: number
    hasMore: boolean

    constructor(data: T[], total: number, skip: number) {
        this.data = data
        this.total = total
        this.hasMore = skip + data.length < total
    }
}

export function ApiPaginatedResponse(itemType: Type) {
    return applyDecorators(
        ApiExtraModels(itemType),
        ApiOkResponse({
            schema: {
                type: 'object',
                required: ['data', 'total', 'hasMore'],
                properties: {
                    data: { type: 'array', items: { $ref: getSchemaPath(itemType) } },
                    total: { type: 'number' },
                    hasMore: { type: 'boolean' },
                },
            },
        })
    )
}
