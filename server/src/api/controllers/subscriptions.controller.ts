import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
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
    ApiParam,
    ApiQuery,
    ApiServiceUnavailableResponse,
    ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request as ExpressRequest } from 'express'
import { AdminRoute } from '@/decorators'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import {
    SubscriptionAccountParamsDto,
    SubscriptionAddAccountRequestDto,
    SubscriptionAutoRenewDto,
    SubscriptionCreateRequestDto,
    SubscriptionDeleteRequestDto,
    SubscriptionListRequestDto,
    SubscriptionParamsDto,
    SubscriptionPasswordResetDto,
    SubscriptionPatchRequestDto,
    SubscriptionResponseDto,
    SubscriptionAccountDeleteRequestDto,
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
    @ApiOkResponse({ description: 'Subscription created successfully', type: SubscriptionResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid request or service unavailable' })
    @ApiConflictResponse({ description: 'Subscription already exists' })
    @ApiServiceUnavailableResponse({ description: 'External service unavailable' })
    async subscribe(@Body() request: SubscriptionCreateRequestDto, @Request() req: ExpressRequest) :  Promise<SubscriptionResponseDto> {
        return this.subscriptionService.subscribe(request, req.session.userId!)
    }

    @Get(routes.subscriptions.subPath.me)
    @ApiOperation({ summary: 'List subscriptions for the current user' })
    @ApiQuery({ name: 'take', type: Number, required: false })
    @ApiQuery({ name: 'skip', type: Number, required: false })
    @ApiOkResponse({ description: 'List of subscriptions for the authenticated user', type: [SubscriptionResponseDto] })
    async listMine(@Request() req: ExpressRequest, @Query() pagination: PaginationRequestDto) : Promise<SubscriptionResponseDto[]> {
        return this.subscriptionService.listByUser(req.session.userId!, pagination.take, pagination.skip)
    }

    @Get(routes.subscriptions.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List subscriptions, optionally filtered by user (admin only)' })
    @ApiQuery({ name: 'userId', type: String, required: false })
    @ApiQuery({ name: 'take', type: Number, required: false })
    @ApiQuery({ name: 'skip', type: Number, required: false })
    @ApiOkResponse({ description: 'List of subscriptions', type: [SubscriptionResponseDto] })
    async listAll(@Query() query: SubscriptionListRequestDto) : Promise<SubscriptionResponseDto[]> {
        if (query.userId) {
            return this.subscriptionService.listByUser(query.userId, query.take, query.skip)
        }

        return this.subscriptionService.listAll(query.take, query.skip)
    }

    @Get(routes.subscriptions.subPath.get)
    @AdminRoute()
    @ApiOperation({ summary: 'Get a subscription by id (admin only)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'The subscription', type: SubscriptionResponseDto })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    async getById(@Param() params: SubscriptionParamsDto) :  Promise<SubscriptionResponseDto>  {
        return this.subscriptionService.getById(params.id)
    }

    @Patch(routes.subscriptions.subPath.update)
    @AdminRoute()
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Update subscription state — enabled and/or autoRenew (admin only)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiBody({ type: SubscriptionPatchRequestDto })
    @ApiOkResponse({ description: 'Subscription updated successfully', type: SubscriptionResponseDto })
    @ApiBadRequestResponse({ description: 'No fields provided or invalid request' })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    @ApiConflictResponse({ description: 'Subscription is not in a valid state for the transition' })
    async update(@Param() params: SubscriptionParamsDto, @Body() request: SubscriptionPatchRequestDto) :  Promise<SubscriptionResponseDto>  {
        return this.subscriptionService.update(params.id, request)
    }

    @Post(routes.subscriptions.subPath.renew)
    @AdminRoute()
    @ApiOperation({ summary: 'Renew a subscription by 30 days (admin only)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiOkResponse({ description: 'Subscription renewed successfully', type: SubscriptionResponseDto })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    async renew(@Param() params: SubscriptionParamsDto) :  Promise<SubscriptionResponseDto>  {
        return this.subscriptionService.renew(params.id)
    }

    @Delete(routes.subscriptions.subPath.delete)
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    @ApiOperation({ summary: 'Cancel a subscription' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiBody({ type: SubscriptionDeleteRequestDto, required: false })
    @ApiOkResponse({ description: 'Subscription cancelled successfully' })
    @ApiBadRequestResponse({ description: 'Invalid request or unauthorized' })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    @ApiConflictResponse({ description: 'User is not subscribed to the service' })
    @ApiServiceUnavailableResponse({ description: 'Failed to delete external account' })
    async delete(
        @Param() params: SubscriptionParamsDto,
        @Body() body: SubscriptionDeleteRequestDto,
        @Request() req: ExpressRequest
    ): Promise<boolean> {
        return this.subscriptionService.delete(params.id, req.session.userId!, body?.immediate)
    }

    @Post(routes.subscriptions.subPath.addAccount)
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    @ApiOperation({ summary: 'Link an additional account to a subscription (owner or admin)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiBody({ type: SubscriptionAddAccountRequestDto })
    @ApiOkResponse({ description: 'Account linked successfully', type: SubscriptionResponseDto })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    @ApiConflictResponse({ description: 'Subscription already at its account limit or not active' })
    @ApiServiceUnavailableResponse({ description: 'External service unavailable' })
    async addAccount(
        @Param() params: SubscriptionParamsDto,
        @Body() request: SubscriptionAddAccountRequestDto,
        @Request() req: ExpressRequest
    ): Promise<SubscriptionResponseDto> {
        return this.subscriptionService.addAccount(params.id, request, req.session.userId!)
    }

    @Post(routes.subscriptions.subPath.resetPassword)
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    @ApiOperation({ summary: 'Reset the password of one linked service account (subscription owner only)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiParam({ name: 'accountId', type: String, format: 'uuid' })
    @ApiBody({ type: SubscriptionPasswordResetDto })
    @ApiOkResponse({ description: 'Password reset successfully' })
    @ApiBadRequestResponse({ description: 'Passwords do not match or account not provisioned' })
    @ApiNotFoundResponse({ description: 'Subscription or linked account not found' })
    @ApiServiceUnavailableResponse({ description: 'External service unavailable' })
    async resetPassword(
        @Param() params: SubscriptionAccountParamsDto,
        @Body() body: SubscriptionPasswordResetDto,
        @Request() req: ExpressRequest
    ): Promise<boolean> {
        return this.subscriptionService.resetAccountPassword(
            params.id,
            req.session.userId!,
            params.accountId,
            body.newPassword
        )
    }

    @Delete(routes.subscriptions.subPath.deleteAccount)
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    @ApiOperation({ summary: 'Unlink an account from a subscription — only while more than one account is linked (owner or admin)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiParam({ name: 'accountId', type: String, format: 'uuid' })
    @ApiBody({ type: SubscriptionAccountDeleteRequestDto, required: false })
    @ApiOkResponse({ description: 'Account unlinked successfully' })
    @ApiConflictResponse({ description: 'Subscription owns only a single account' })
    @ApiNotFoundResponse({ description: 'Subscription or linked account not found' })
    @ApiServiceUnavailableResponse({ description: 'External service unavailable' })
    async deleteAccount(
        @Param() params: SubscriptionAccountParamsDto,
        @Body() body: SubscriptionAccountDeleteRequestDto,
        @Request() req: ExpressRequest
    ): Promise<boolean> {
        return this.subscriptionService.deleteAccount(
            params.id,
            params.accountId,
            req.session.userId!,
            body?.deprovisionExternal
        )
    }

    @Patch(routes.subscriptions.subPath.autoRenew)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Toggle auto-renew for the subscription owner' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiBody({ type: SubscriptionAutoRenewDto })
    @ApiOkResponse({ description: 'Auto-renew updated', type: SubscriptionResponseDto })
    @ApiNotFoundResponse({ description: 'Subscription not found' })
    async setAutoRenew(
        @Param() params: SubscriptionParamsDto,
        @Body() body: SubscriptionAutoRenewDto,
        @Request() req: ExpressRequest
    ): Promise<SubscriptionResponseDto> {
        return this.subscriptionService.setAutoRenew(params.id, req.session.userId!, body.autoRenew)
    }
}
