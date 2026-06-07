import { JellyfinClient } from '@/core/clients/jellyfin.client'
import { routes } from '@/types/dtos/routes'
import { Controller, Request, Post, Inject, Query, Get, Put, Body, Delete, Patch } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiQuery } from '@nestjs/swagger'
import type { Request as ExpressRequest } from 'express'

@Controller(routes.test.basePath)
export class TestController {
    constructor(@Inject(JellyfinClient) private jellyfinClinet: JellyfinClient) {}

    @Post()
    post(@Request() req: ExpressRequest) {
        console.log(req.session.csrfToken)
    }

    @ApiQuery({
        name: 'userAccountId',
        type: String,
        required: true,
    })
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                isActive: { type: 'boolean' },
            },
        },
    })
    @Get('jellyfin_user')
    async get(@Query('userAccountId') userAccountId: string) {
        return this.jellyfinClinet.getUser(userAccountId)
    }

    @Get('jellyfin_users')
    async getAll() {
        return await this.jellyfinClinet.getAllUsers()
    }

    @ApiBody({
        schema: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
                username: {
                    type: 'string',
                    example: 'john.doe',
                },
                password: {
                    type: 'string',
                    example: 'P@ssw0rd!',
                },
            },
        },
    })
    @Put('jellyfin_user/create')
    async createJellyfinUser(@Body('username') username: string, @Body('password') password: string) {
        return await this.jellyfinClinet.createUser({ username: username, password: password })
    }
    @ApiQuery({
        name: 'userAccountId',
        type: String,
        required: true,
    })
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
            },
        },
    })
    @Delete('jellyfin_user/delete')
    async deleteJellyfinUser(@Query('userAccountId') userAccountId: string) {
        const success = await this.jellyfinClinet.deleteUser(userAccountId)

        return { success }
    }

    @ApiQuery({
        name: 'userAccountId',
        type: String,
        required: true,
    })
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
            },
        },
    })
    @Patch('jellyfin_user/disable')
    async disableJellyfinUser(@Query('userAccountId') userAccountId: string) {
        const success = await this.jellyfinClinet.disableUser(userAccountId)

        return { success }
    }

    @ApiQuery({
        name: 'userAccountId',
        type: String,
        required: true,
    })
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
            },
        },
    })
    @Patch('jellyfin_user/enable')
    async enableJellyfinUser(@Query('userAccountId') userAccountId: string) {
        const success = await this.jellyfinClinet.enableUser(userAccountId)

        return { success }
    }
}
