import { Controller, Get, Inject, Res, Req, UseFilters } from '@nestjs/common'
import type { Response, Request } from 'express'
import { resolve } from 'path'
import { Public, AdminRoute } from '@/decorators'
import { EnvRepository } from '@/data/repositories/env.repository'
import { clientRoutes } from '@/types/dtos/routes'
import { ClientRouteExceptionFilter } from './client-route-exception.filter'

@Controller()
@UseFilters(ClientRouteExceptionFilter)
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

    @Get(clientRoutes.account)
    legacyAccount(@Res() res: Response) {
        return res.redirect(clientRoutes.subscriptions)
    }

    @Get(clientRoutes.subscriptions)
    subscriptions(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.subscriptions)
    }

    @AdminRoute()
    @Get(clientRoutes.adminUsers)
    adminUsers(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminUsers)
    }

    @AdminRoute()
    @Get(clientRoutes.adminPolicies)
    adminPolicies(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminPolicies)
    }

    @AdminRoute()
    @Get(clientRoutes.adminDashboard)
    adminDashboard(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminDashboard)
    }

    @AdminRoute()
    @Get(clientRoutes.adminInvites)
    adminInvites(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminInvites)
    }

    @AdminRoute()
    @Get(clientRoutes.adminServices)
    adminServices(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminServices)
    }

    @AdminRoute()
    @Get(clientRoutes.adminOAuthProviders)
    adminOAuthProviders(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminOAuthProviders)
    }

    @AdminRoute()
    @Get(clientRoutes.adminSubscriptions)
    adminSubscriptions(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminSubscriptions)
    }

    @AdminRoute()
    @Get(clientRoutes.adminAccounts)
    adminAccounts(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminAccounts)
    }

    @AdminRoute()
    @Get(clientRoutes.adminLogs)
    adminLogs(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminLogs)
    }

    @AdminRoute()
    @Get(clientRoutes.adminScheduledTasks)
    adminScheduledTasks(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminScheduledTasks)
    }

    @AdminRoute()
    @Get(clientRoutes.adminSessions)
    adminSessions(@Res() res: Response) {
        return this.sendPage(res, clientRoutes.adminSessions)
    }

    @Public()
    @Get('*path')
    notFound(@Res() res: Response) {
        return res.redirect(`${clientRoutes.error}?status=404`)
    } //IMPORTANT: this must be the last route in this controller due to its genearlized matching.

    private sendPage(res: Response, page: string) {
        if(page.charAt(0) == '/'){
            page = page.substring(1)
        }

        return res.sendFile(resolve(this.staticRoot, `${page}.html`))
    }
}
