import { Body, Controller, Delete, ForbiddenException, Get, Inject, NotFoundException, Param, Put, Query, Request } from '@nestjs/common'
import { ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request as ExpressRequest } from 'express'
import { AdminRoute } from '@/decorators'
import { UserService } from '@/api/services/user.service'
import { UserDeleteRequestDto, UserLoadRequestDto, UserResponseForAdminDto } from '@/types/dtos/userDto'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('Users')
@Controller(routes.users.basePath)
export class UserController {
    constructor(@Inject(UserService) private readonly userService: UserService) {}

    @Delete(routes.users.subPath.delete)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    @ApiOperation({ summary: 'Delete a user account (soft or hard)' })
    @ApiBody({ type: UserDeleteRequestDto })
    @ApiOkResponse({ description: 'User deleted successfully' })
    @ApiForbiddenResponse({ description: 'Insufficient permissions' })
    async deleteUser(@Body() request: UserDeleteRequestDto, @Request() req: ExpressRequest): Promise<void> {
        const sessionUserId = req.session.userId!
        const sessionIsAdmin = req.session.isAdmin ?? false

        if (request.softDelete) {
            this.assertSelfOrAdmin(sessionUserId, request.userId, sessionIsAdmin)
            await this.userService.softDeleteUser(request.userId)
        } else {
            this.assertAdmin(sessionIsAdmin)
            await this.userService.hardDeleteUser(request.userId)
        }
    }

    @Put(routes.users.subPath.disable)
    @AdminRoute()
    @ApiOperation({ summary: 'Disable a user account' })
    @ApiBody({ type: UserLoadRequestDto })
    @ApiOkResponse({ description: 'User disabled successfully' })
    async disableUser(@Body() request: UserLoadRequestDto): Promise<void> {
        await this.userService.disableUser(request.userId)
    }

    @Put(routes.users.subPath.enable)
    @AdminRoute()
    @ApiOperation({ summary: 'Enable a user account' })
    @ApiBody({ type: UserLoadRequestDto })
    @ApiOkResponse({ description: 'User enabled successfully' })
    async enableUser(@Body() request: UserLoadRequestDto): Promise<void> {
        await this.userService.enableUser(request.userId)
    }

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
    async getUser(@Param('id') id: string): Promise<UserResponseForAdminDto> {
        const user = await this.userService.getUserByIdForAdmin(id)
        if (!user) throw new NotFoundException(`User '${id}' not found`)
        return user
    }

    private assertSelfOrAdmin(sessionUserId: string, targetUserId: string, isAdmin: boolean): void {
        if (sessionUserId !== targetUserId && !isAdmin) {
            throw new ForbiddenException('You do not have permission to delete this account.')
        }
    }

    private assertAdmin(isAdmin: boolean): void {
        if (!isAdmin) {
            throw new ForbiddenException('Only administrators may permanently delete accounts.')
        }
    }
}

