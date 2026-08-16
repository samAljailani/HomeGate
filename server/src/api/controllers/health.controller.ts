import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOkResponse } from '@nestjs/swagger'

@ApiTags('Health')
@Controller('/api/health')
export class HealthController {
    @Get()
    @ApiOkResponse({ description: 'Server is healthy' })
    check() {
        return { status: 'ok' }
    }
}
