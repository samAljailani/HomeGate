import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Request,
} from '@nestjs/common'
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiConflictResponse,
    ApiNotFoundResponse,
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
    SubscriptionDeleteQueryDto,
    SubscriptionListQueryDto,
    SubscriptionPatchRequestDto,
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

    @Get(routes.subscriptions.subPath.me)
    @ApiOperation({ summary: 'List subscriptions for the current user' })
    @ApiOkResponse({ description: 'List of subscriptions for the authenticated user' })
    async listMine(@Request() req: ExpressRequest, @Query() pagination: PaginationRequestDto) {
        return this.subscriptionService.listByUser(req.session.userId!, pagination.take, pagination.skip)
    }

    @Get(routes.subscriptions.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List subscriptions, optionally filtered by user (admin only)' })
    @ApiOkResponse({ description: 'List of subscriptions' })
    async listAll(@Query() query: SubscriptionListQueryDto) {
        if (query.userId) {
            return this.subscriptionService.listByUser(query.userId, query.take, query.skip)
        }

        return this.subscriptionService.listAll(query.take, query.skip)
    }

    @Get(routes.subscriptions.subPath.get)
    @AdminRoute()
    @ApiOperation({ summary: 'Get a subscription by id (admin only)' })
    @ApiOkResponse({ description: 'The subscription' })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    async getById(@Param('id', ParseUUIDPipe) id: string) {
        return this.subscriptionService.getById(id)
    }

    @Patch(routes.subscriptions.subPath.update)
    @AdminRoute()
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Update subscription state — enabled and/or autoRenew (admin only)' })
    @ApiBody({ type: SubscriptionPatchRequestDto })
    @ApiOkResponse({ description: 'Subscription updated successfully' })
    @ApiBadRequestResponse({ description: 'No fields provided or invalid request' })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    @ApiConflictResponse({ description: 'Subscription is not in a valid state for the transition' })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() request: SubscriptionPatchRequestDto) {
        return this.subscriptionService.update(id, request)
    }

    @Post(routes.subscriptions.subPath.renew)
    @AdminRoute()
    @ApiOperation({ summary: 'Renew a subscription by 30 days (admin only)' })
    @ApiOkResponse({ description: 'Subscription renewed successfully' })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    async renew(@Param('id', ParseUUIDPipe) id: string) {
        return this.subscriptionService.renew(id)
    }

    @Delete(routes.subscriptions.subPath.delete)
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    @ApiOperation({ summary: 'Cancel a subscription' })
    @ApiOkResponse({ description: 'Subscription cancelled successfully' })
    @ApiBadRequestResponse({ description: 'Invalid request or unauthorized' })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    @ApiConflictResponse({ description: 'User is not subscribed to the service' })
    @ApiServiceUnavailableResponse({ description: 'Failed to delete external account' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: SubscriptionDeleteQueryDto,
        @Request() req: ExpressRequest
    ) {
        return this.subscriptionService.delete(id, req.session.userId!, query.immediate)
    }
}
