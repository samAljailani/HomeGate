import { Body, Controller, Delete, Inject, Post, Put, Request } from '@nestjs/common'
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
    SubscriptionCreateRequestDto,
    SubscriptionDeleteRequestDto,
    SubscriptionDisableRequestDto as SubscriptionActionRequestDto,
} from '@/types/dtos/subscriptionsDto'
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
    async disable(@Body() request: SubscriptionActionRequestDto, @Request() req: ExpressRequest) {
        return this.subscriptionService.disable(request, req.session.userId!)
    }

    @Put(routes.subscriptions.subPath.enable)
    @AdminRoute()
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Enable a user subscription (admin only)' })
    @ApiBody({ type: SubscriptionActionRequestDto })
    @ApiOkResponse({ description: 'Subscription enabled successfully' })
    @ApiBadRequestResponse({ description: 'Unauthorized or invalid request' })
    @ApiConflictResponse({ description: 'User account is not currently disabled' })
    async enable(@Body() request: SubscriptionActionRequestDto, @Request() req: ExpressRequest) {
        return this.subscriptionService.enable(request, req.session.userId!)
    }
}
