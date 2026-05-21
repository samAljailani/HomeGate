import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common'
import { ApiBody, ApiQuery } from '@nestjs/swagger'
import { TestService } from '@/services/test.service'
import { EnvResponse } from '@homepage/types'
import routes from '../types/dtos/routes'
import { UserRepository } from '@/repositories/user.repository';
import { UserModel } from '@prisma/generated/models';
import { UserCreateRequestDto } from '@/types/dtos/userDto';

@Controller(routes.test.basePath)
export class TestController {
    constructor(
        @Inject(TestService) private readonly testService: TestService,
        @Inject(UserRepository) private userRepository: UserRepository
    ) {}

    @Get()
    getTestData(): EnvResponse {
        this.testService.getMessage();
        const envResponse = new EnvResponse('/static');
        return envResponse;
    }

    @Get('/user')
    @ApiQuery({ name: 'user_id', type: String })
    async getUser(@Query('user_id') user_id: string): Promise<UserModel | null> {
        return this.userRepository.get({ user_id });
    }

    @Post('/user')
    @ApiBody({ type: UserCreateRequestDto })
    async postUser(@Body() user: UserCreateRequestDto): Promise<UserModel | null> {
        return this.userRepository.post(user);
    }
}