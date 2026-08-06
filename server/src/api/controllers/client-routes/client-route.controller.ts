import { Controller, Get, Inject, Res, Req } from '@nestjs/common'
import type { Response, Request } from 'express'
import { resolve } from 'path'
import { Public, AdminRoute } from '@/decorators'
import { EnvRepository } from '@/data/repositories/env.repository'
import { clientRoutes } from '@/types/dtos/routes'

@Controller()
export class ClientRouteController {
    private readonly staticRoot: string

    constructor(@Inject(EnvRepository) envRepository: EnvRepository) {
        this.staticRoot = resolve(process.cwd(), envRepository.getEnv().client.buildPath)
    }

    @Public()
    @Get(clientRoutes.signIn)
    signIn(@Req() req: Request, @Res() res: Response) {
        if (req.session?.userId) return res.redirect(clientRoutes.home)
        return this.sendPage(res, 'signin')
    }

    @Public()
    @Get(clientRoutes.error)
    error(@Res() res: Response) {
        return this.sendPage(res, 'error')
    }

    @Get(clientRoutes.home)
    home(@Res() res: Response) {
        return res.sendFile(resolve(this.staticRoot, 'index.html'))
    }

    @AdminRoute()
    @Get(clientRoutes.admin)
    admin(@Res() res: Response) {
        return this.sendPage(res, 'admin')
    }

    @AdminRoute()
    @Get(clientRoutes.adminInvites)
    adminInvites(@Res() res: Response) {
        return this.sendPage(res, 'admin/invites')
    }

    private sendPage(res: Response, page: string) {
        return res.sendFile(resolve(this.staticRoot, `${page}.html`))
    }
}
