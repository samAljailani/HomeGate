import { Controller, Get, Inject } from '@nestjs/common'
import { TestService } from '@/services/test.service'
import { EnvResponse } from '@homepage/types'
import routes from '../../types/dtos/routes'

@Controller(routes.test.basePath)
export class TestController {
    constructor(@Inject(TestService) private readonly testService: TestService) {}

    @Get()
    getTestData(): EnvResponse {
        this.testService.getMessage();
        const envResponse = new EnvResponse('/static');
        return envResponse;
    }
}