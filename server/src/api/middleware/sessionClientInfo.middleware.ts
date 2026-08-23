import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

/**
 * Stamps the client IP and user-agent onto the session object so PrismaSessionStore
 * can persist them alongside the cookie payload. Must run after express-session.
 */
@Injectable()
export class SessionClientInfoMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void {
        if (req.session) {
            const session = req.session as Request['session'] & {
                ipAddress?: string
                userAgent?: string
            }

            const ip = req.ip ?? req.socket.remoteAddress
            if (!session.ipAddress && ip != null) {
                session.ipAddress = ip
            }

            const userAgent = req.headers['user-agent']
            if (!session.userAgent && userAgent != null) {
                session.userAgent = userAgent
            }
        }

        next()
    }
}
