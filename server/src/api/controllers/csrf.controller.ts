import { Controller, Get, Req } from '@nestjs/common'
import type { Request } from 'express'
import { generateToken } from '@/api/security/csrf'
import { routes } from '@/types/dtos/routes'
import { Throttle } from '@nestjs/throttler'

@Controller(routes.csrf.basePath)
export class CsrfController {
    @Get()
    @Throttle({ default: { ttl: 60_000, limit: 30 } })
    getCsrfToken(@Req() req: Request) {
        return {
            csrfToken: generateToken(req),
        }
    }
    //TODO: do not throw 500 filter exceptions to the UI when the csrf token is not provided. throw a not authorized error.
}
