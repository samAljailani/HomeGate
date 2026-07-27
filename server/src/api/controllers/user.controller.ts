import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Inject,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    Request,
} from '@nestjs/common'
import { ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request as ExpressRequest } from 'express'
import { AdminRoute } from '@/decorators'
import { UserService } from '@/api/services/user.service'
import {
    UserDeleteQueryDto,
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
    @ApiOkResponse({ type: UserResponseForAdminDto })
    async getUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseForAdminDto> {
        const user = await this.userService.getUserByIdForAdmin(id)
        if (!user) throw new NotFoundException(`User '${id}' not found`)
        return user
    }

    @Patch(routes.users.subPath.update)
    @AdminRoute()
    @ApiOperation({ summary: 'Update a user account state — enabled (admin only)' })
    @ApiBody({ type: UserPatchRequestDto })
    @ApiOkResponse({ description: 'User updated successfully' })
    async updateUser(@Param('id', ParseUUIDPipe) id: string, @Body() request: UserPatchRequestDto): Promise<void> {
        if (request.enabled === undefined) return

        if (request.enabled) {
            await this.userService.enableUser(id)
        } else {
            await this.userService.disableUser(id)
        }
    }

    @Delete(routes.users.subPath.delete)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Delete a user account (soft or hard)' })
    @ApiOkResponse({ description: 'User deleted successfully' })
    @ApiForbiddenResponse({ description: 'Insufficient permissions' })
    async deleteUser(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: UserDeleteQueryDto,
        @Request() req: ExpressRequest
    ): Promise<void> {
        const sessionUserId = req.session.userId!
        const sessionIsAdmin = req.session.isAdmin ?? false

        // Non-admins may only soft-delete their own account; the hard flag is ignored for them.
        if (query.hard && sessionIsAdmin) {
            await this.userService.hardDeleteUser(id)
            return
        }

        this.assertSelfOrAdmin(sessionUserId, id, sessionIsAdmin)
        await this.userService.softDeleteUser(id)
    }

    private assertSelfOrAdmin(sessionUserId: string, targetUserId: string, isAdmin: boolean): void {
        if (sessionUserId !== targetUserId && !isAdmin) {
            throw new ForbiddenException('You do not have permission to delete this account.')
        }
    }
}
