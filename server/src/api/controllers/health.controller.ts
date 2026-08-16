import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOkResponse } from '@nestjs/swagger'
import { Public } from '@/decorators'

@ApiTags('Health')
@Controller('/api/health')
export class HealthController {
    @Get()
    @Public()
    @ApiOkResponse({ description: 'Server is healthy' })
    check() {
        return { status: 'ok' }
    }
}
