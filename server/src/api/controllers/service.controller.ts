import { Body, Controller, Get, Inject, Put, Query } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { ServiceActionRequestDto, ServiceResponseDto } from '@/types/dtos/serviceDto'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'
import { ApplicationClientNames } from '@/types/enums'

@ApiTags('Services')
@Controller(routes.services.basePath)
export class ServiceController {
    constructor(@Inject(ServiceManagementService) private readonly serviceManagementService: ServiceManagementService) {}

    @Get(routes.services.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List all services (admin only)' })
    @ApiOkResponse({ type: [ServiceResponseDto] })
    async list(@Query() pagination: PaginationRequestDto): Promise<ServiceResponseDto[]> {
        const services = await this.serviceManagementService.list(pagination.take, pagination.skip)
        return services.map((s) => ({ id: s.id, name: s.name, enabled: s.enabled }))
    }

    @Put(routes.services.subPath.enable)
    @AdminRoute()
    @ApiOperation({ summary: 'Enable a service (admin only)' })
    @ApiBody({ type: ServiceActionRequestDto })
    @ApiOkResponse({ type: ServiceResponseDto })
    async enable(@Body() request: ServiceActionRequestDto): Promise<ServiceResponseDto> {
        const service = await this.serviceManagementService.enable(request.name as ApplicationClientNames)
        return { id: service.id, name: service.name, enabled: service.enabled }
    }

    @Put(routes.services.subPath.disable)
    @AdminRoute()
    @ApiOperation({ summary: 'Disable a service (admin only)' })
    @ApiBody({ type: ServiceActionRequestDto })
    @ApiOkResponse({ type: ServiceResponseDto })
    async disable(@Body() request: ServiceActionRequestDto): Promise<ServiceResponseDto> {
        const service = await this.serviceManagementService.disable(request.name as ApplicationClientNames)
        return { id: service.id, name: service.name, enabled: service.enabled }
    }
}
