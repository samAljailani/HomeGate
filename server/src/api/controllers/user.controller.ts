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
} from '@nestjs/common'
import { ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request as ExpressRequest } from 'express'
import { AdminRoute } from '@/decorators'
import { UserService } from '@/api/services/user.service'
import {
    UserDeleteRequestDto,
    UserParamsDto,
    UserPatchRequestDto,
    UserResponseForAdminDto,
} from '@/types/dtos/userDto'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('Users')
@Controller(routes.users.basePath)
export class UserController {
    constructor(@Inject(UserService) private readonly userService: UserService) {}

    @Get(routes.users.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List all users' })
    @ApiOkResponse({ type: [UserResponseForAdminDto] })
    async listUsers(@Query() pagination: PaginationRequestDto): Promise<UserResponseForAdminDto[]> {
        return this.userService.listUsers(pagination.take, pagination.skip)
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
    @ApiOperation({ summary: 'Update a user account state — enabled (admin only)' })
    @ApiParam({ name: 'id', type: String, format: 'uuid' })
    @ApiBody({ type: UserPatchRequestDto })
    @ApiOkResponse({ description: 'User updated successfully', type: UserResponseForAdminDto })
    async updateUser(
        @Param() params: UserParamsDto,
        @Body() request: UserPatchRequestDto
    ): Promise<UserResponseForAdminDto | null> {
        if (request.enabled === undefined) return this.userService.getUserByIdForAdmin(params.id)

        if (request.enabled) {
            return this.userService.enableUser(params.id)
        } else {
            return this.userService.disableUser(params.id)
        }
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
}
