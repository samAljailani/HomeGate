import { Controller, Get, Req } from '@nestjs/common'
import type { Request } from 'express'
import { generateToken } from '@/security/csrf'
import { routes } from '@/types/dtos/routes'

@Controller(routes.csrf.basePath)
export class CsrfController {
    @Get()
    getCsrfToken(@Req() req: Request) {
        return {
            csrfToken: generateToken(req),
        }
    }
}
