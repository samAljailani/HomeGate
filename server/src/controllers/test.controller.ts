import { Body, Controller, Get, Inject, Post, Query, Request } from '@nestjs/common'
import { ApiBody, ApiQuery } from '@nestjs/swagger'
import { TestService } from '@/services/test.service'
import { routes } from '../types/dtos/routes'
import { IUserRepository } from '@/repositories'
import { UserModel } from '@prisma/generated/models'
import { UserCreateRequestDto } from '@/types/dtos/userDto'
import type { Request as ExpressRequest } from 'express'
import { Public } from '@/decorators'

@Controller(routes.test.basePath)
export class TestController {
    constructor(
        @Inject(TestService) private readonly testService: TestService,
        @Inject(IUserRepository) private userRepository: IUserRepository
    ) {}

    @Get('/protected')
    getProtectedData(@Request() req: ExpressRequest) {
        const userId = req.session?.userId
        return this.testService.getProtectedMessage(userId || 'unknown')
    }

    @Public()
    @Get('/user')
    @ApiQuery({ name: 'userId', type: String })
    async getUser(@Query('userId') userId: string): Promise<UserModel | null> {
        return this.userRepository.get({ userId })
    }

    @Public()
    @Post('/user')
    @ApiBody({ type: UserCreateRequestDto })
    async postUser(@Body() user: UserCreateRequestDto): Promise<UserModel | null> {
        return this.userRepository.post(user)
    }
}
