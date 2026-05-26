import { IS_PUBLIC } from '@/decorators'
import { Injectable, Inject, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import 'express-session'

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(@Inject(Reflector) private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean | Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ])

        if (isPublic) {
            return true
        }

        const request = context.switchToHttp().getRequest<Request>()

        //express-session handles expired sessions.
        return !!request.session?.userId
    }
}
