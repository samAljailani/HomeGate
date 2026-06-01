import { routes } from '@/types/dtos/routes'
import { Controller, Request, Post } from '@nestjs/common'
import type { Request as ExpressRequest } from 'express'

@Controller(routes.test.basePath)
export class TestController {
    @Post()
    post(@Request() req: ExpressRequest) {
        console.log(req.session.csrfToken)
    }
}
