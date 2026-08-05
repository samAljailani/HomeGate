import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { clientRoutes } from '@/types/dtos/routes'

@Injectable()
export class ClientRouteGuard implements NestMiddleware {
    private static readonly ASSET_EXT = /\.(js|css|map|ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)$/i

    use(req: Request, res: Response, next: NextFunction) {
        const path = req.path.toLowerCase().replace(/\.html$/, '')
        if (path.startsWith('/api') || ClientRouteGuard.ASSET_EXT.test(req.path)) return next()
        if (path === clientRoutes.signIn) {
            if (req.session?.userId) return res.redirect(clientRoutes.home)
            return next()
        }
        if (!req.session?.userId) return res.redirect(clientRoutes.signIn + '.html')
        if (path.startsWith(clientRoutes.admin) && !req.session?.isAdmin) return res.redirect(clientRoutes.home)
        next()
    }
}
