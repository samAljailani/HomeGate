import { Controller, Get } from '@nestjs/common'
import { TestService } from '../services/test.service'

@Controller('test')
export class TestController {
    constructor(private readonly testService: TestService) {}

    @Get()
    getTestData(): { message: string } {
        return this.testService.getMessage()
    }
}
