import { Controller, Get, Inject, Req, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { Public } from '@/decorators'
import { ForwardAuthService } from '@/api/services/forwardAuth.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { routes } from '@/types/dtos/routes'
import { EnvRepository } from '@/data/repositories/env.repository'

@ApiTags('Auth')
@Controller(routes.auth.basePath)
export class ForwardAuthController {
    private readonly homeUrl: string

    constructor(
        @Inject(ForwardAuthService) private readonly forwardAuth: ForwardAuthService,
        @Inject(EnvRepository) private readonly env: EnvRepository,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
        this.homeUrl = this.env.getEnv().host
    }

    @Get(routes.auth.subPath.forward)
    @Public()
    @ApiOperation({ summary: 'Traefik ForwardAuth — validates session and service entitlement' })
    async forward(@Req() req: Request, @Res() res: Response): Promise<void> {
        const forwardedHost = req.headers['x-forwarded-host']
        const hostname = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost

        if (!hostname) {
            res.status(400).send()
            return
        }

        const userId = req.session?.userId
        if (!userId) {
            if (this.isNavigationRequest(req)) {
                const returnUrl = this.buildReturnUrl(req)
                res.redirect(302, `${this.homeUrl}/signin?returnUrl=${encodeURIComponent(returnUrl)}`)
            } else {
                res.status(401).send()
            }
            return
        }

        const service = await this.forwardAuth.resolveService(hostname)

        if (!service) {
            this.logger.warn(`Forward auth: no service found for host '${hostname}'`)
            res.status(403).send()
            return
        }

        const allowed = await this.forwardAuth.isAuthorized(userId, service)

        if (!allowed) {
            this.logger.warn(`Forward auth: denied user '${userId}' for service '${service.slug}'`)
            res.status(403).send()
            return
        }

        res.status(200).send()
    }

    private isNavigationRequest(req: Request): boolean {
        const accept = req.headers['accept'] ?? ''
        return accept.includes('text/html')
    }

    private buildReturnUrl(req: Request): string {
        const proto = req.headers['x-forwarded-proto'] || 'https'
        const host = req.headers['x-forwarded-host'] || ''
        const uri = req.headers['x-forwarded-uri'] || '/'
        return `${proto}://${host}${uri}`
    }
}
