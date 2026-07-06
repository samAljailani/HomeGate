import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Request } from '@nestjs/common'
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiConflictResponse,
    ApiOkResponse,
    ApiOperation,
    ApiServiceUnavailableResponse,
    ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request as ExpressRequest } from 'express'
import { AdminRoute } from '@/decorators'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import {
    SubscriptionAutoRenewRequestDto,
    SubscriptionCreateRequestDto,
    SubscriptionDeleteRequestDto,
    SubscriptionDisableRequestDto as SubscriptionActionRequestDto,
    SubscriptionRenewRequestDto,
} from '@/types/dtos/subscriptionsDto'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('Subscriptions')
@Controller(routes.subscriptions.basePath)
export class SubscriptionController {
    constructor(
        @Inject(SubscriptionService)
        private readonly subscriptionService: SubscriptionService
    ) {}

    @Post()
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    @ApiOperation({ summary: 'Subscribe to a service' })
    @ApiBody({ type: SubscriptionCreateRequestDto })
    @ApiOkResponse({ description: 'Subscription created successfully' })
    @ApiBadRequestResponse({ description: 'Invalid request or service unavailable' })
    @ApiConflictResponse({ description: 'Subscription already exists' })
    @ApiServiceUnavailableResponse({ description: 'External service unavailable' })
    async subscribe(@Body() request: SubscriptionCreateRequestDto, @Request() req: ExpressRequest) {
        return this.subscriptionService.subscribe(request, req.session.userId!)
    }

    @Delete()
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    @ApiOperation({ summary: 'Cancel a subscription' })
    @ApiBody({ type: SubscriptionDeleteRequestDto })
    @ApiOkResponse({ description: 'Subscription cancelled successfully' })
    @ApiBadRequestResponse({ description: 'Invalid request or unauthorized' })
    @ApiConflictResponse({ description: 'User is not subscribed to the service' })
    @ApiServiceUnavailableResponse({ description: 'Failed to delete external account' })
    async delete(@Body() request: SubscriptionDeleteRequestDto, @Request() req: ExpressRequest) {
        return this.subscriptionService.delete(request, req.session.userId!)
    }

    @Put(routes.subscriptions.subPath.disable)
    @AdminRoute()
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Disable a user subscription (admin only)' })
    @ApiBody({ type: SubscriptionActionRequestDto })
    @ApiOkResponse({ description: 'Subscription disabled successfully' })
    @ApiBadRequestResponse({ description: 'Unauthorized or invalid request' })
    @ApiConflictResponse({ description: 'User account is not currently active' })
    async disable(@Body() request: SubscriptionActionRequestDto) {
        return this.subscriptionService.disable(request)
    }

    @Put(routes.subscriptions.subPath.enable)
    @AdminRoute()
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Enable a user subscription (admin only)' })
    @ApiBody({ type: SubscriptionActionRequestDto })
    @ApiOkResponse({ description: 'Subscription enabled successfully' })
    @ApiBadRequestResponse({ description: 'Unauthorized or invalid request' })
    @ApiConflictResponse({ description: 'User account is not currently disabled' })
    async enable(@Body() request: SubscriptionActionRequestDto) {
        return this.subscriptionService.enable(request)
    }

    @Put(routes.subscriptions.subPath.renew)
    @AdminRoute()
    @ApiOperation({ summary: 'Renew a subscription by 30 days (admin only)' })
    @ApiBody({ type: SubscriptionRenewRequestDto })
    @ApiOkResponse({ description: 'Subscription renewed successfully' })
    @ApiBadRequestResponse({ description: 'Subscription not found' })
    async renew(@Body() request: SubscriptionRenewRequestDto) {
        return this.subscriptionService.renew(request.userId, request.serviceId)
    }

    @Put(routes.subscriptions.subPath.autoRenew)
    @AdminRoute()
    @ApiOperation({ summary: 'Set auto-renew on a subscription (admin only)' })
    @ApiBody({ type: SubscriptionAutoRenewRequestDto })
    @ApiOkResponse({ description: 'Auto-renew updated successfully' })
    @ApiBadRequestResponse({ description: 'Subscription not found' })
    async setAutoRenew(@Body() request: SubscriptionAutoRenewRequestDto) {
        return this.subscriptionService.setAutoRenew(request.userId, request.serviceId, request.autoRenew)
    }

    @Get(routes.subscriptions.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List all subscriptions (admin only)' })
    @ApiOkResponse({ description: 'List of all subscriptions' })
    async listAll(@Query() pagination: PaginationRequestDto) {
        return this.subscriptionService.listAll(pagination.take, pagination.skip)
    }

    @Get(routes.subscriptions.subPath.listByUser)
    @AdminRoute()
    @ApiOperation({ summary: 'List subscriptions for a specific user (admin only)' })
    @ApiOkResponse({ description: 'List of subscriptions for the user' })
    async listByUser(@Param('userId') userId: string, @Query() pagination: PaginationRequestDto) {
        return this.subscriptionService.listByUser(userId, pagination.take, pagination.skip)
    }
}

