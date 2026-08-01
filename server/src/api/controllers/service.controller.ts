import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Query } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { ServiceParamsDto, ServicePatchRequestDto, ServiceResponseDto } from '@/types/dtos/serviceDto'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'
import { ApplicationClientNames } from '@/types/enums'

@ApiTags('Services')
@Controller(routes.services.basePath)
export class ServiceController {
    constructor(
        @Inject(ServiceManagementService) private readonly serviceManagementService: ServiceManagementService
    ) {}

    @Get(routes.services.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List all services (admin only)' })
    @ApiQuery({ name: 'take', type: Number, required: false })
    @ApiQuery({ name: 'skip', type: Number, required: false })
    @ApiOkResponse({ type: [ServiceResponseDto] })
    async list(@Query() pagination: PaginationRequestDto): Promise<ServiceResponseDto[]> {
        const services = await this.serviceManagementService.list(pagination.take, pagination.skip)
        return services.map((s) => ({ id: s.id, name: s.name, enabled: s.enabled, url: s.url }))
    }

    @Patch(routes.services.subPath.update)
    @AdminRoute()
    @ApiOperation({ summary: 'Update service state — enabled (admin only)' })
    @ApiParam({ name: 'name', type: String })
    @ApiBody({ type: ServicePatchRequestDto })
    @ApiOkResponse({ type: ServiceResponseDto })
    async update(@Param() params: ServiceParamsDto, @Body() request: ServicePatchRequestDto): Promise<ServiceResponseDto> {
        if (request.enabled === undefined) {
            throw new BadRequestException('No fields provided to update')
        }

        const service = request.enabled
            ? await this.serviceManagementService.enable(params.name as ApplicationClientNames)
            : await this.serviceManagementService.disable(params.name as ApplicationClientNames)

        return { id: service.id, name: service.name, enabled: service.enabled, url: service.url }
    }
}
