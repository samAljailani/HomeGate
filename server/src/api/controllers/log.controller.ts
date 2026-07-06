import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { LogService } from '@/api/services/log.service'
import { LogListRequestDto, LogResponseDto } from '@/types/dtos/logDto'
import { LogFilterOptions } from '@/data/repositories/ILoggingRepository'
import { routes } from '@/types/dtos/routes'

@ApiTags('Logs')
@Controller(routes.logs.basePath)
export class LogController {
    constructor(@Inject(LogService) private readonly logService: LogService) {}

    @Get(routes.logs.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List application logs (admin only)' })
    @ApiOkResponse({ type: [LogResponseDto] })
    async list(@Query() query: LogListRequestDto): Promise<LogResponseDto[]> {
        const filter: LogFilterOptions = {}
        if (query.userId !== undefined) filter.userId = query.userId
        if (query.logLevel !== undefined) filter.logLevel = query.logLevel
        return this.logService.list(filter, query.take, query.skip)
    }
}
