import { Body, Controller, Get, Inject, Param, Post, Put, Request } from '@nestjs/common'
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiConflictResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnprocessableEntityResponse,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request as ExpressRequest } from 'express'
import { AdminRoute, Public } from '@/decorators'
import { InviteService } from '@/api/services/invite.service'
import { CreateInviteRequestDto, ValidateInviteResponseDto } from '@/types/dtos/inviteDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('Invites')
@Controller(routes.invites.basePath)
export class InviteController {
    constructor(@Inject(InviteService) private readonly inviteService: InviteService) {}

    @Post()
    @AdminRoute()
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Generate an invite token (admin only)' })
    @ApiBody({ type: CreateInviteRequestDto })
    @ApiOkResponse({ description: 'Invite token created successfully' })
    @ApiBadRequestResponse({ description: 'Invalid request' })
    async create(@Body() request: CreateInviteRequestDto, @Request() req: ExpressRequest) {
        return this.inviteService.createToken(request, req.session.userId!)
    }

    @Get()
    @AdminRoute()
    @ApiOperation({ summary: 'List all invites (admin only)' })
    @ApiOkResponse({ description: 'List of all invites' })
    async list() {
        return this.inviteService.listInvites()
    }

    @Put(routes.invites.subPath.revoke)
    @AdminRoute()
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Revoke an invite (admin only)' })
    @ApiParam({ name: 'id', type: String })
    @ApiOkResponse({ description: 'Invite revoked successfully' })
    @ApiNotFoundResponse({ description: 'Invite not found' })
    async revoke(@Param('id') id: string) {
        return this.inviteService.revokeToken(id)
    }

    @Get(routes.invites.subPath.validate)
    @Public()
    @Throttle({ default: { ttl: 60_000, limit: 20 } })
    @ApiOperation({ summary: 'Validate an invite token (public)' })
    @ApiParam({ name: 'token', type: String })
    @ApiOkResponse({ description: 'Token is valid', type: ValidateInviteResponseDto })
    @ApiBadRequestResponse({ description: 'Token is invalid' })
    @ApiNotFoundResponse({ description: 'Token not found' })
    @ApiConflictResponse({ description: 'Token already used' })
    @ApiUnprocessableEntityResponse({ description: 'Token expired or revoked' })
    @ApiForbiddenResponse({ description: 'Token not valid for this account' })
    async validate(@Param('token') token: string): Promise<ValidateInviteResponseDto> {
        await this.inviteService.validateToken(token) // will throw if in valid
        return { valid: true }
    }
}
