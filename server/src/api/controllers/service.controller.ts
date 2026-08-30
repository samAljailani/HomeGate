import { Body, Controller, Delete, Get, Inject, Param, Patch, Put, Query, Request } from '@nestjs/common'
import { ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
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
    @ApiOperation({
        summary: 'Update a service — slug, enabled, url, imageUrl (admin only)',
    })
    @ApiParam({ name: 'slug', type: String })
    @ApiBody({ type: ServicePatchRequestDto })
    @ApiOkResponse({ type: ServiceResponseDto })
    async update(@Param() params: ServiceParamsDto, @Body() request: ServicePatchRequestDto): Promise<ServiceResponseDto> {
        return this.serviceManagementService.update(params.slug, request)
    }

    @Delete(routes.services.subPath.delete)
    @AdminRoute()
    @ApiOperation({
        summary: 'Delete a service (admin only). MANAGED services cannot be deleted.',
    })
    @ApiParam({ name: 'slug', type: String })
    @ApiOkResponse({ type: ServiceResponseDto })
    @ApiBadRequestResponse({ description: 'MANAGED services cannot be deleted through the API' })
    @ApiNotFoundResponse({ description: 'Service not found' })
    @ApiConflictResponse({ description: 'Service is referenced by subscriptions, accounts or other services' })
    async remove(@Param() params: ServiceParamsDto): Promise<ServiceResponseDto> {
        return this.serviceManagementService.delete(params.slug)
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
