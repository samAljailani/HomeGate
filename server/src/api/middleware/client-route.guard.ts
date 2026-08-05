import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { clientRoutes } from '@/types/dtos/routes'

/**
 * Protects static client pages served by ServeStaticModule.
 * - Public pages (signIn, error): accessible without auth; signIn redirects to home if already logged in.
 * - Unknown pages: redirect to /error?status=404.
 * - Unauthenticated requests: redirect to /error?status=401.
 * - Non-admin accessing /admin: redirect to /error?status=403.
 * - Valid authenticated requests: rewrites req.url to append .html for static file resolution.
 */
@Injectable()
export class ClientRouteGuard implements NestMiddleware {
    private static readonly ASSET_EXT = /\.(js|css|map|ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)$/i
    private static readonly PUBLIC_PAGES: readonly string[] = [clientRoutes.signIn, clientRoutes.error]
    private static readonly VALID_PAGES: ReadonlySet<string> = new Set(Object.values(clientRoutes))

    use(req: Request, res: Response, next: NextFunction) {
        const path = req.path.toLowerCase().replace(/\/+$/, '').replace(/\.html$/, '') || '/'
        if (path.startsWith('/api') || ClientRouteGuard.ASSET_EXT.test(req.path)) return next()
        if (ClientRouteGuard.PUBLIC_PAGES.includes(path)) {
            if (path === clientRoutes.signIn && req.session?.userId) return res.redirect(clientRoutes.home)
            return this.serve(req, path, next)
        }
        if (!req.session?.userId) return res.redirect(`${clientRoutes.error}.html?status=401`)
        if (!ClientRouteGuard.VALID_PAGES.has(path)) return res.redirect(`${clientRoutes.error}.html?status=404`)
        if (path.startsWith(clientRoutes.admin) && !req.session?.isAdmin) return res.redirect(`${clientRoutes.error}.html?status=403`)
        this.serve(req, path, next)
    }

    private serve(req: Request, path: string, next: NextFunction) {
        if (path !== '/') {
            const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
            req.url = `${path}.html${query}`
        }
        next()
    }
}
