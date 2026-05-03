import { Controller, Get, Inject } from '@nestjs/common'
import { TestService } from '@/services/test.service'
import { EnvResponse } from '@homepage/types'

@Controller('test')
export class TestController {
    constructor(@Inject(TestService) private readonly testService: TestService) {}

    @Get()
    getTestData(): EnvResponse {
        this.testService.getMessage();
        const envResponse = new EnvResponse('/static');
        return envResponse;
    }
}