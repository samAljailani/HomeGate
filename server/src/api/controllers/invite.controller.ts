import { Body, BadRequestException, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Request } from '@nestjs/common'
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request as ExpressRequest } from 'express'
import { AdminRoute } from '@/decorators'
import { InviteService } from '@/api/services/invite.service'
import {
    CreateInviteRequestDto,
    CreateInviteResponseDto,
    InviteParamsDto,
    InvitePatchRequestDto,
    InviteResponseDto,
} from '@/types/dtos/inviteDto'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('Invites')
@Controller(routes.invites.basePath)
export class InviteController {
    constructor(@Inject(InviteService) private readonly inviteService: InviteService) {}

    @Post()
    @AdminRoute()
    @Throttle({ default: { ttl: 60_000, limit: 60 } })
    @ApiOperation({ summary: 'Generate an invite token (admin only)' })
    @ApiBody({ type: CreateInviteRequestDto })
    @ApiOkResponse({ description: 'Invite token created successfully', type: CreateInviteResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid request' })
    async create(
        @Body() request: CreateInviteRequestDto,
        @Request() req: ExpressRequest
    ): Promise<CreateInviteResponseDto> {
        return this.inviteService.createToken(request, req.session.userId!)
    }

    @Get()
    @AdminRoute()
    @ApiOperation({ summary: 'List all invites (admin only)' })
    @ApiQuery({ name: 'take', type: Number, required: false })
    @ApiQuery({ name: 'skip', type: Number, required: false })
    @ApiOkResponse({ description: 'List of all invites', type: [InviteResponseDto] })
    async list(@Query() pagination: PaginationRequestDto): Promise<InviteResponseDto[]> {
        return this.inviteService.listInvites(pagination.take, pagination.skip)
    }


    @Patch(routes.invites.subPath.update)
    @AdminRoute()
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Revoke an invite (admin only)' })
    @ApiParam({ name: 'id', type: String })
    @ApiBody({ type: InvitePatchRequestDto })
    @ApiOkResponse({ description: 'Invite revoked successfully', type: InviteResponseDto })
    @ApiNotFoundResponse({ description: 'Invite not found' })
    async update(
        @Param() params: InviteParamsDto,
        @Body() request: InvitePatchRequestDto,
        @Request() req: ExpressRequest
    ): Promise<InviteResponseDto> {
        if (request.revoked !== true) {
            throw new BadRequestException('Only revoking an invite is supported (revoked: true)')
        }

        return this.inviteService.revokeToken(params.id, req.session.userId!)
    }

    @Delete(routes.invites.subPath.delete)
    @AdminRoute()
    @HttpCode(204)
    @ApiOperation({ summary: 'Delete an invite (admin only)' })
    @ApiParam({ name: 'id', type: String })
    @ApiNotFoundResponse({ description: 'Invite not found' })
    async delete(@Param() params: InviteParamsDto): Promise<void> {
        await this.inviteService.deleteInvite(params.id)
    }
}
