import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Inject,
    NotFoundException,
    Param,
    Patch,
    Query,
    Request,
    Res,
} from '@nestjs/common'
import { ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { AdminRoute } from '@/decorators'
import { UserService } from '@/api/services/user.service'
import { IServiceRepository, IUserServicePolicyRepository } from '@/data/repositories'
import {
    UserDeleteRequestDto,
    UserParamsDto,
    UserPatchRequestDto,
    UserResponseForAdminDto,
    UserStatsResponseDto,
} from '@/types/dtos/userDto'
import {
    UserServicePolicySetRequestDto,
    UserServicePolicyResponseDto,
} from '@/types/dtos/userServicePolicyDto'
import { PaginationRequestDto, PaginatedResponseDto, ApiPaginatedResponse } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('Users')
@Controller(routes.users.basePath)
export class UserController {
    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(IUserServicePolicyRepository) private readonly policyRepository: IUserServicePolicyRepository,
        @Inject(IServiceRepository) private readonly serviceRepository: IServiceRepository
    ) {}

    @Get(routes.users.subPath.stats)
    @AdminRoute()
    @ApiOperation({ summary: 'Get a user statistics' })
    @ApiOkResponse({ type: UserStatsResponseDto })
    async getUserStats(): Promise<UserStatsResponseDto> {
        return await this.userService.getUserStats()
    }

    @Get(routes.users.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List all users' })
    @ApiQuery({ name: 'take', type: Number, required: false })
    @ApiQuery({ name: 'skip', type: Number, required: false })
    @ApiPaginatedResponse(UserResponseForAdminDto)
    async listUsers(@Query() pagination: PaginationRequestDto): Promise<PaginatedResponseDto<UserResponseForAdminDto>> {
        return this.userService.listUsers(pagination.take, pagination.skip)
    }

    @Get(routes.users.subPath.avatar)
    @ApiOperation({ summary: "Proxy the current user's avatar image" })
    async getAvatar(@Request() req: ExpressRequest, @Res() res: ExpressResponse) {
        const avatarUrl = await this.userService.getAvatarUrl(req.session.userId!)
        if (!avatarUrl) {
            return res.status(404).send()
        }

        try {
            const upstream = await fetch(avatarUrl)
            if (!upstream.ok || !upstream.body) {
                return res.status(502).send()
            }

            const contentType = upstream.headers.get('content-type')
            if (contentType) res.setHeader('Content-Type', contentType)
            res.setHeader('Cache-Control', 'private, max-age=300')

            const buffer = Buffer.from(await upstream.arrayBuffer())
            return res.send(buffer)
        } catch {
            return res.status(502).send()
        }
    }

    @Get(routes.users.subPath.get)
    @AdminRoute()
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiOkResponse({ type: UserResponseForAdminDto })
    async getUser(@Param() params: UserParamsDto): Promise<UserResponseForAdminDto> {
        const user = await this.userService.getUserByIdForAdmin(params.id)
        if (!user) throw new NotFoundException(`User '${params.id}' not found`)
        return user
    }

    @Patch(routes.users.subPath.update)
    @AdminRoute()
    @ApiOperation({ summary: 'Update a user account state — enabled/admin (admin only)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiBody({ type: UserPatchRequestDto })
    @ApiOkResponse({ description: 'User updated successfully', type: UserResponseForAdminDto })
    async updateUser(
        @Param() params: UserParamsDto,
        @Body() request: UserPatchRequestDto,
        @Request() req: ExpressRequest
    ): Promise<UserResponseForAdminDto | null> {
        if (request.enabled === undefined && request.admin === undefined) {
            return this.userService.getUserByIdForAdmin(params.id)
        }

        let updatedUser: UserResponseForAdminDto | null = null

        if (request.admin !== undefined) {
            updatedUser = await this.userService.setUserAdmin(params.id, request.admin, req.session.userId!)
        }

        if (request.enabled !== undefined) {
            if (params.id === req.session.userId) {
                throw new ForbiddenException('You cannot disable your own account.')
            }

            updatedUser = request.enabled
                ? await this.userService.enableUser(params.id)
                : await this.userService.disableUser(params.id)
        }

        return updatedUser
    }

    @Delete(routes.users.subPath.delete)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Delete a user account (soft or hard)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiBody({ type: UserDeleteRequestDto, required: false })
    @ApiOkResponse({ description: 'User deleted successfully', type: Boolean })
    @ApiForbiddenResponse({ description: 'Insufficient permissions' })
    async deleteUser(
        @Param() params: UserParamsDto,
        @Body() body: UserDeleteRequestDto,
        @Request() req: ExpressRequest
    ): Promise<boolean> {
        const sessionUserId = req.session.userId!
        const sessionIsAdmin = req.session.isAdmin ?? false

        // Non-admins may only soft-delete their own account; the hard flag is ignored for them.
        if (body?.hard && sessionIsAdmin) {
            if (params.id === sessionUserId) {
                throw new ForbiddenException('You cannot permanently delete your own account.')
            }
            return this.userService.hardDeleteUser(params.id)
        }

        this.assertSelfOrAdmin(sessionUserId, params.id, sessionIsAdmin)
        return this.userService.softDeleteUser(params.id)
    }

    private assertSelfOrAdmin(sessionUserId: string, targetUserId: string, isAdmin: boolean): void {
        if (sessionUserId !== targetUserId && !isAdmin) {
            throw new ForbiddenException('You do not have permission to delete this account.')
        }
    }

    // #region service policies

    @Get(routes.users.subPath.listPolicies)
    @AdminRoute()
    @ApiOperation({ summary: "List a user's service access policies" })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiOkResponse({ type: [UserServicePolicyResponseDto] })
    async listPolicies(@Param() params: UserParamsDto): Promise<UserServicePolicyResponseDto[]> {
        const policies = await this.policyRepository.findByUserId(params.id)
        const serviceIds = [...new Set(policies.map((p) => p.serviceId))]
        const services = await Promise.all(serviceIds.map((id) => this.serviceRepository.findById(id)))
        const serviceMap = new Map(services.filter(Boolean).map((s) => [s!.id, s!]))

        return policies.map((p) => {
            const service = serviceMap.get(p.serviceId)
            return {
                id: p.id,
                userId: p.userId,
                serviceId: p.serviceId,
                serviceName: service?.name ?? '',
                serviceSlug: service?.slug ?? '',
                effect: p.effect,
                createdByUserId: p.createdByUserId,
                createdAt: p.createdAt.toISOString(),
            }
        })
    }

    @Patch(routes.users.subPath.setPolicy)
    @AdminRoute()
    @ApiOperation({ summary: 'Set a service access policy for a user (upsert)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiBody({ type: UserServicePolicySetRequestDto })
    @ApiOkResponse({ type: UserServicePolicyResponseDto })
    async setPolicy(
        @Param() params: UserParamsDto,
        @Body() body: UserServicePolicySetRequestDto,
        @Request() req: ExpressRequest
    ): Promise<UserServicePolicyResponseDto> {
        const service = await this.serviceRepository.findById(body.serviceId)
        if (!service) throw new NotFoundException(`Service '${body.serviceId}' not found`)

        const policy = await this.policyRepository.upsert({
            userId: params.id,
            serviceId: body.serviceId,
            effect: body.effect,
            createdByUserId: req.session.userId!,
        })

        return {
            id: policy.id,
            userId: policy.userId,
            serviceId: policy.serviceId,
            serviceName: service.name,
            serviceSlug: service.slug,
            effect: policy.effect,
            createdByUserId: policy.createdByUserId,
            createdAt: policy.createdAt.toISOString(),
        }
    }

    @Delete(routes.users.subPath.deletePolicy)
    @AdminRoute()
    @ApiOperation({ summary: 'Remove a service access policy, reverting to the service default' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiParam({ name: 'serviceId', type: Number })
    @ApiOkResponse({ description: 'Policy removed' })
    async deletePolicy(@Param('id') userId: string, @Param('serviceId') serviceId: string): Promise<void> {
        await this.policyRepository.delete(userId, Number(serviceId))
    }

    // #endregion service policies
}
