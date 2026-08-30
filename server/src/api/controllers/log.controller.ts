import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { LogService } from '@/api/services/log.service'
import { LogListRequestDto, LogResponseDto } from '@/types/dtos/logDto'
import { LogFilterOptions } from '@/data/repositories/ILoggingRepository'
import { PaginatedResponseDto, ApiPaginatedResponse } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'
import { LogLevel, LogSortField, SortDirection } from '@/types/enums'

@ApiTags('Logs')
@Controller(routes.logs.basePath)
export class LogController {
    constructor(@Inject(LogService) private readonly logService: LogService) {}

    @Get(routes.logs.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List application logs (admin only)' })
    @ApiQuery({ name: 'userId', type: String, required: false })
    @ApiQuery({ name: 'sessionId', type: String, required: false })
    @ApiQuery({ name: 'logLevel', enum: LogLevel, required: false })
    @ApiQuery({ name: 'createdAfter', type: String, required: false })
    @ApiQuery({ name: 'createdBefore', type: String, required: false })
    @ApiQuery({ name: 'search', type: String, required: false })
    @ApiQuery({ name: 'take', type: Number, required: false })
    @ApiQuery({ name: 'skip', type: Number, required: false })
    @ApiQuery({ name: 'orderBy', enum: LogSortField, required: false })
    @ApiQuery({ name: 'orderDirection', enum: SortDirection, required: false })
    @ApiPaginatedResponse(LogResponseDto)
    async list(@Query() query: LogListRequestDto): Promise<PaginatedResponseDto<LogResponseDto>> {
        const filter: LogFilterOptions = {}
        if (query.userId !== undefined) filter.userId = query.userId
        if (query.sessionId !== undefined) filter.sessionId = query.sessionId
        if (query.logLevel !== undefined) filter.logLevel = query.logLevel
        if (query.orderBy !== undefined) filter.orderBy = query.orderBy
        if (query.orderDirection !== undefined) filter.orderDirection = query.orderDirection
        if (query.createdAfter !== undefined) filter.createdAfter = new Date(query.createdAfter)
        if (query.createdBefore !== undefined) filter.createdBefore = new Date(query.createdBefore)
        if (query.search !== undefined) filter.search = query.search
        return this.logService.list(filter, query.take, query.skip)
    }
}
