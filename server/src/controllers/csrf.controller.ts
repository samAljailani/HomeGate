import { Controller, Get, Req } from '@nestjs/common'
import type { Request } from 'express'
import { generateToken } from '@/security/csrf'
import { routes } from '@/types/dtos/routes'
import { Throttle } from '@nestjs/throttler'

@Controller(routes.csrf.basePath)
export class CsrfController {
    @Get()
    @Throttle({ short: { ttl: 60_000, limit: 40 } })
    getCsrfToken(@Req() req: Request) {
        return {
            csrfToken: generateToken(req),
        }
    }
}
