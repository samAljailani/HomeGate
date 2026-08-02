import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Query } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import { ExternalAccountResponseDto, ServiceParamsDto, ServicePatchRequestDto, ServiceResponseDto } from '@/types/dtos/serviceDto'
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
    //@AdminRoute()
    @ApiOperation({ summary: 'List all services (admin only)' })
    @ApiQuery({ name: 'take', type: Number, required: false })
    @ApiQuery({ name: 'skip', type: Number, required: false })
    @ApiOkResponse({ type: [ServiceResponseDto] })
    async list(@Query() pagination: PaginationRequestDto): Promise<ServiceResponseDto[]> {
        return this.serviceManagementService.list(pagination.take, pagination.skip)
    }

    @Patch(routes.services.subPath.update)
    @AdminRoute()
    @ApiOperation({ summary: 'Update service state — enabled, imageUrl (admin only)' })
    @ApiParam({ name: 'name', type: String })
    @ApiBody({ type: ServicePatchRequestDto })
    @ApiOkResponse({ type: ServiceResponseDto })
    async update(@Param() params: ServiceParamsDto, @Body() request: ServicePatchRequestDto): Promise<ServiceResponseDto> {
        if (request.enabled === undefined && request.imageUrl === undefined) {
            throw new BadRequestException('No fields provided to update')
        }

        const name = params.name as ApplicationClientNames
        let service: ServiceResponseDto | undefined

        if (request.enabled !== undefined) {
            service = request.enabled
                ? await this.serviceManagementService.enable(name)
                : await this.serviceManagementService.disable(name)
        }

        if (request.imageUrl !== undefined) {
            service = await this.serviceManagementService.updateImageUrl(name, request.imageUrl)
        }

        return service!
    }

    @Get(routes.services.subPath.accounts)
    @AdminRoute()
    @ApiOperation({ summary: 'List external accounts for an integrated service (admin only)' })
    @ApiParam({ name: 'name', type: String })
    @ApiOkResponse({ type: [ExternalAccountResponseDto] })
    async listAccounts(@Param() params: ServiceParamsDto): Promise<ExternalAccountResponseDto[]> {
        const name = params.name as ApplicationClientNames
        return this.serviceManagementService.listExternalAccounts(name)
    }
}
