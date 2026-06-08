import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { IApplicationClient } from '@/core/clients/IApplicationClient'
import { routes } from '@/types/dtos/routes'
import { ApplicationClientNames } from '@/types/enums'
import { Public } from '@/decorators'
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    Patch,
    Post,
    Put,
    Request,
} from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiParam } from '@nestjs/swagger'
import type { Request as ExpressRequest } from 'express'

@Public()
@Controller(routes.test.basePath)
export class TestController {
    constructor(
        @Inject(ApplicationClientRegistry)
        private readonly applicationClientRegistry: ApplicationClientRegistry,
    ) {}

    private getClient(name: string): IApplicationClient {
        if (!Object.values(ApplicationClientNames).includes(name as ApplicationClientNames)) {
            throw new BadRequestException(`Invalid application client name: ${name}`)
        }

        return this.applicationClientRegistry.get(name as ApplicationClientNames)
    }

    @Post()
    post(@Request() req: ExpressRequest) {
        console.log(req.session.csrfToken)
    }

    @ApiParam({
        name: 'clientName',
        enum: ApplicationClientNames,
        required: true,
    })
    @ApiParam({
        name: 'userAccountId',
        type: 'string',
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
    @Get(':clientName/user/:userAccountId')
    async getUser(
        @Param('clientName') clientName: string,
        @Param('userAccountId') userAccountId: string,
    ) {
        const client = this.getClient(clientName)

        return client.getUser(userAccountId)
    }

    @ApiParam({
        name: 'clientName',
        enum: ApplicationClientNames,
        required: true,
    })
    @Get(':clientName/users')
    async getAllUsers(@Param('clientName') clientName: string) {
        const client = this.getClient(clientName)

        return client.getAllUsers()
    }

    @ApiParam({
        name: 'clientName',
        enum: ApplicationClientNames,
        required: true,
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                username: {
                    type: 'string',
                    example: 'john.doe',
                },
                email: {
                    type: 'string',
                    example: 'john.doe@example.com',
                },
                displayName: {
                    type: 'string',
                    example: 'John Doe',
                },
                password: {
                    type: 'string',
                    example: 'P@ssw0rd!',
                },
            },
        },
    })
    @Put(':clientName/user/create')
    async createUser(
        @Param('clientName') clientName: string,
        @Body() request: Parameters<IApplicationClient['createUser']>[0],
    ) {
        const client = this.getClient(clientName)

        return client.createUser(request)
    }

    @ApiParam({
        name: 'clientName',
        enum: ApplicationClientNames,
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
    @Delete(':clientName/user/:userAccountId')
    async deleteUser(
        @Param('clientName') clientName: string,
        @Param('userAccountId') userAccountId: string,
    ) {
        const client = this.getClient(clientName)
        const success = await client.deleteUser(userAccountId)

        return { success }
    }

    @ApiParam({
        name: 'clientName',
        enum: ApplicationClientNames,
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
    @Patch(':clientName/user/:userAccountId/disable')
    async disableUser(
        @Param('clientName') clientName: string,
        @Param('userAccountId') userAccountId: string,
    ) {
        const client = this.getClient(clientName)
        const success = await client.disableUser(userAccountId)

        return { success }
    }

    @ApiParam({
        name: 'clientName',
        enum: ApplicationClientNames,
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
    @Patch(':clientName/user/:userAccountId/enable')
    async enableUser(
        @Param('clientName') clientName: string,
        @Param('userAccountId') userAccountId: string,
    ) {
        const client = this.getClient(clientName)
        const success = await client.enableUser(userAccountId)

        return { success }
    }
}