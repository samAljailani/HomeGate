import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { DashboardService } from '@/api/services/dashboard.service'
import { DashboardStatsResponseDto } from '@/types/dtos/dashboardDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('Dashboard')
@Controller(routes.dashboard.basePath)
export class DashboardController {
    constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

    @Get(routes.dashboard.subPath.stats)
    @AdminRoute()
    @ApiOperation({ summary: 'Get aggregate admin dashboard statistics' })
    @ApiOkResponse({ type: DashboardStatsResponseDto })
    async getStats(): Promise<DashboardStatsResponseDto> {
        return this.dashboardService.getStats()
    }
}
