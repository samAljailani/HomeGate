import { Controller, Get, Inject, Req, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { Public } from '@/decorators'
import { Throttle } from '@nestjs/throttler'
import { ForwardAuthService } from '@/api/services/forwardAuth.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { routes, clientRoutes } from '@/types/dtos/routes'
import { EnvRepository } from '@/data/repositories/env.repository'

@ApiTags('Auth')
@Controller(routes.auth.basePath)
export class ForwardAuthController {
    private readonly homeUrl: string
    private readonly homeHostname: string

    constructor(
        @Inject(ForwardAuthService) private readonly forwardAuth: ForwardAuthService,
        @Inject(EnvRepository) private readonly env: EnvRepository,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
        this.homeUrl = this.env.getEnv().host
        this.homeHostname = new URL(this.homeUrl).hostname
    }

    @Get(routes.auth.subPath.forward)
    @Public()
    @Throttle({ default: { ttl: 60_000, limit: 10000 } })
    @ApiOperation({ summary: 'Traefik ForwardAuth — validates session and service entitlement' })
    async forward(@Req() req: Request, @Res() res: Response): Promise<void> {       
        const hostname = this.getForwardedHostname(req)

        if (!hostname) {
           res.status(400).send()
           return
        }
        const requestedUrl = this.buildReturnUrl(req)
        this.logger.debug(`Forward auth: request for '${requestedUrl}'`)

        const userId = req.session?.userId
        if (!userId) {
            if (this.isNavigationRequest(req)) {
                // Only persist a return URL when the requested host is one of our apps: otherwise
                // the user is just landing on HomeGate itself, and redirecting back to it would be
                // circular. The service lookup also stops an arbitrary forwarded host from becoming
                // the post-login redirect target.
                const service = await this.forwardAuth.resolveService(hostname)
                const redirectUrl = new URL(this.homeUrl)
                redirectUrl.pathname = clientRoutes.signIn

                if (service) {
                    const returnUrl = this.buildReturnUrl(req)
                    req.session.returnUrl = returnUrl
                    redirectUrl.searchParams.set('returnUrl', returnUrl)
                    redirectUrl.searchParams.set('appName', service.name)
                }

                res.redirect(302, redirectUrl.toString())
            } else {
                res.status(401).send()
            }
            return
        }

        if (this.isHomeHost(hostname)) {
            res.status(200).send()
            return
        }

        const service = await this.forwardAuth.resolveService(hostname)
        this.logger.debug(`Forward auth: host '${hostname}' resolved to service '${service?.id ?? 'none'}'`)

        if (!service) {
            this.logger.warn(`Forward auth: no service found for '${requestedUrl}'`)
            if (this.isNavigationRequest(req)) {
                this.redirectToError(res, 'access_denied', hostname)
            } else {
                res.status(403).send()
            }
            return
        }

        const allowed = await this.forwardAuth.isAuthorized(userId, service)

        if (!allowed) {
            this.logger.warn(`Forward auth: denied user '${userId}' for service '${service.slug}' (${requestedUrl})`)
            if (this.isNavigationRequest(req)) {
                this.redirectToError(res, 'access_denied', service.name)
            } else {
                res.status(403).send()
            }
            return
        }

        res.status(200).send()
    }

    private redirectToError(res: Response, error: string, appName?: string): void {
        const redirectUrl = new URL(this.homeUrl)
        redirectUrl.pathname = clientRoutes.error
        redirectUrl.searchParams.set('error', error)
        if (appName) redirectUrl.searchParams.set('appName', appName)
        res.redirect(302, redirectUrl.toString())
    }

    private isNavigationRequest(req: Request): boolean {
        const accept = req.headers['accept'] ?? ''
        return accept.includes('text/html')
    }

    private isHomeHost(hostname: string): boolean {
        return hostname.toLowerCase() === this.homeHostname.toLowerCase()
    }

    private buildReturnUrl(req: Request): string {
        const proto = req.headers['x-forwarded-proto'] || 'https'
        const host = req.headers['x-forwarded-host'] || ''
        const uri = req.headers['x-forwarded-uri'] || '/'
        return `${proto}://${host}${uri}`
    }

    private getForwardedHostname(req: Request): string | null {
        const raw = req.headers['x-forwarded-host']
        const value = Array.isArray(raw) ? raw[0] : raw

        if (!value) return null

        // Proxies may send multiple hosts, and the Host header may contain a port.
        const host = value.split(',')[0]?.trim()
        if (!host) return null

        try {
            return new URL(`https://${host}`).hostname.toLowerCase()
        } catch {
            return null
        }
    }
}
