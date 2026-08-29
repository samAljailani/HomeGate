import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Put, Query, Request } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import type { Request as ExpressRequest } from 'express'
import { AdminRoute } from '@/decorators'
import { ServiceManagementService } from '@/api/services/serviceManagement.service'
import {
    ExternalAccountResponseDto,
    ServiceParamsDto,
    ServicePatchRequestDto,
    ServicePutRequestDto,
    ServiceResponseDto,
} from '@/types/dtos/serviceDto'
import { PaginationRequestDto, PaginatedResponseDto, ApiPaginatedResponse } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'

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
    @ApiPaginatedResponse(ServiceResponseDto)
    async list(@Query() pagination: PaginationRequestDto, @Request() req: ExpressRequest): Promise<PaginatedResponseDto<ServiceResponseDto>> {
        return this.serviceManagementService.list(req.session.userId!, pagination.take, pagination.skip)
    }

    @Put(routes.services.subPath.create)
    @AdminRoute()
    @ApiOperation({
        summary: 'Create a service (admin only). Only REFERENCED and NONE account types are accepted.',
    })
    @ApiBody({ type: ServicePutRequestDto })
    @ApiOkResponse({ type: ServiceResponseDto })
    async create(@Body() request: ServicePutRequestDto): Promise<ServiceResponseDto> {
        return this.serviceManagementService.create(request)
    }

    @Patch(routes.services.subPath.update)
    @AdminRoute()
    @ApiOperation({ summary: 'Update service state — enabled, imageUrl (admin only)' })
    @ApiParam({ name: 'slug', type: String })
    @ApiBody({ type: ServicePatchRequestDto })
    @ApiOkResponse({ type: ServiceResponseDto })
    async update(@Param() params: ServiceParamsDto, @Body() request: ServicePatchRequestDto): Promise<ServiceResponseDto> {
        if (request.enabled === undefined && request.url === undefined && request.imageUrl === undefined) {
            throw new BadRequestException('No fields provided to update')
        }

        const { slug } = params
        let service: ServiceResponseDto | undefined

        if (request.enabled !== undefined) {
            service = request.enabled
                ? await this.serviceManagementService.enable(slug)
                : await this.serviceManagementService.disable(slug)
        }

        if (request.url !== undefined) {
            service = await this.serviceManagementService.updateUrl(slug, request.url)
        }

        if (request.imageUrl !== undefined) {
            service = await this.serviceManagementService.updateImageUrl(slug, request.imageUrl)
        }

        return service!
    }

    @Get(routes.services.subPath.accounts)
    @AdminRoute()
    @ApiOperation({ summary: 'List external accounts for an integrated service (admin only)' })
    @ApiParam({ name: 'slug', type: String })
    @ApiOkResponse({ type: [ExternalAccountResponseDto] })
    async listAccounts(@Param() params: ServiceParamsDto): Promise<ExternalAccountResponseDto[]> {
        return this.serviceManagementService.listExternalAccounts(params.slug)
    }
}
