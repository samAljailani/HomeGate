import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { IApplicationManager } from '@/core/clients/IApplicationManager'
import { routes } from '@/types/dtos/routes'
import { ApplicationClientNames } from '@/types/enums'
import { Public } from '@/decorators'
import { type FilterApplicationUserParam } from '@/types/params/application.client'
import { SubscriptionService } from '../services/subscriptions.service'
import { SubscriptionCreateRequestDto } from '@/types/dtos/subscriptionsDto'
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
    Query,
    Request,
} from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery } from '@nestjs/swagger'
import type { Request as ExpressRequest } from 'express'

@Public()
@Controller(routes.test.basePath)
export class TestController {
    constructor(
        @Inject(ApplicationClientRegistry)
        private readonly applicationClientRegistry: ApplicationClientRegistry,
        @Inject(SubscriptionService)
        private readonly subscriptionService: SubscriptionService
    ) {}

    private getClient(name: string): IApplicationManager {
        if (!Object.values(ApplicationClientNames).includes(name as ApplicationClientNames)) {
            throw new BadRequestException(`Invalid application client name: ${name}`)
        }

        const client = this.applicationClientRegistry.get(name as ApplicationClientNames)

        if (!client) {
            throw new BadRequestException(`Application client not found: ${name}`)
        }

        return client
    }

    private validateUserFilter(filter: FilterApplicationUserParam): FilterApplicationUserParam {
        if (!filter?.username && !filter?.email && !filter?.userServiceAccountId) {
            throw new BadRequestException('At least one filter is required: username, email, or userServiceAccountId')
        }

        return filter
    }

    @Post()
    post(@Request() req: ExpressRequest) {
        console.log(req.session.csrfToken)
    }

    @ApiBody({
        type: SubscriptionCreateRequestDto,
    })
    @Post('subscriptions/:userId')
    async subscribe(@Body() request: SubscriptionCreateRequestDto, @Request() req: ExpressRequest) {
        let userId = req.session?.userId!
        return this.subscriptionService.subscribe(request, userId)
    }

    @ApiParam({
        name: 'clientName',
        enum: ApplicationClientNames,
        required: true,
    })
    @ApiQuery({
        name: 'username',
        type: 'string',
        required: false,
    })
    @ApiQuery({
        name: 'email',
        type: 'string',
        required: false,
    })
    @ApiQuery({
        name: 'userServiceAccountId',
        type: 'string',
        required: false,
    })
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                displayName: { type: 'string' },
                isActive: { type: 'boolean' },
            },
        },
    })
    @Get(':clientName/user')
    async getUser(@Param('clientName') clientName: string, @Query() filter: FilterApplicationUserParam) {
        const client = this.getClient(clientName)

        return client.getUser(this.validateUserFilter(filter))
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
        @Body() request: Parameters<IApplicationManager['createUser']>[0]
    ) {
        const client = this.getClient(clientName)

        return client.createUser(request)
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
                },
                email: {
                    type: 'string',
                },
                userServiceAccountId: {
                    type: 'string',
                },
            },
        },
    })
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
            },
        },
    })
    @Delete(':clientName/user')
    async deleteUser(@Param('clientName') clientName: string, @Body() filter: FilterApplicationUserParam) {
        const client = this.getClient(clientName)

        const success = await client.deleteUser(this.validateUserFilter(filter))

        return { success }
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
                },
                email: {
                    type: 'string',
                },
                userServiceAccountId: {
                    type: 'string',
                },
            },
        },
    })
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
            },
        },
    })
    @Patch(':clientName/user/disable')
    async disableUser(@Param('clientName') clientName: string, @Body() filter: FilterApplicationUserParam) {
        const client = this.getClient(clientName)

        const success = await client.disableUser(this.validateUserFilter(filter))

        return { success }
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
                },
                email: {
                    type: 'string',
                },
                userServiceAccountId: {
                    type: 'string',
                },
            },
        },
    })
    @ApiOkResponse({
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
            },
        },
    })
    @Patch(':clientName/user/enable')
    async enableUser(@Param('clientName') clientName: string, @Body() filter: FilterApplicationUserParam) {
        const client = this.getClient(clientName)

        const success = await client.enableUser(this.validateUserFilter(filter))

        return { success }
    }
}
