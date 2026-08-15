import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { LogService } from '@/api/services/log.service'
import { LogListRequestDto, LogResponseDto } from '@/types/dtos/logDto'
import { LogFilterOptions } from '@/data/repositories/ILoggingRepository'
import { PaginatedResponseDto, ApiPaginatedResponse } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'
import { LogLevel } from '@/types/enums'

@ApiTags('Logs')
@Controller(routes.logs.basePath)
export class LogController {
    constructor(@Inject(LogService) private readonly logService: LogService) {}

    @Get(routes.logs.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List application logs (admin only)' })
    @ApiQuery({ name: 'userId', type: String, required: false })
    @ApiQuery({ name: 'logLevel', enum: LogLevel, required: false })
    @ApiQuery({ name: 'take', type: Number, required: false })
    @ApiQuery({ name: 'skip', type: Number, required: false })
    @ApiPaginatedResponse(LogResponseDto)
    async list(@Query() query: LogListRequestDto): Promise<PaginatedResponseDto<LogResponseDto>> {
        const filter: LogFilterOptions = {}
        if (query.userId !== undefined) filter.userId = query.userId
        if (query.logLevel !== undefined) filter.logLevel = query.logLevel
        return this.logService.list(filter, query.take, query.skip)
    }
}
