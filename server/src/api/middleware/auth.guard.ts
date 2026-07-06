import { IS_PUBLIC, IS_ADMIN } from '@/decorators'
import { IUserRepository } from '@/data/repositories'
import { Injectable, Inject, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import 'express-session'

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        @Inject(Reflector) private reflector: Reflector,
        @Inject(IUserRepository) private userRepository: IUserRepository
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (this.isPublicRoute(context)) {
            return true
        }

        const request = context.switchToHttp().getRequest<Request>()

        if (!request.session?.userId) {
            request.session.destroy(() => {})
            return false
        }

        const user = await this.userRepository.findById(request.session.userId)

        if (!user || user.isDeleted || !user.isEnabled) {
            request.session.destroy(() => {})
            return false
        }

        if (this.isAdminRoute(context) && !user.isAdmin) {
            return false
        }

        // express-session handles expired sessions.
        return true
    }

    private isPublicRoute(context: ExecutionContext): boolean {
        return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]) ?? false
    }

    private isAdminRoute(context: ExecutionContext): boolean {
        return this.reflector.getAllAndOverride<boolean>(IS_ADMIN, [context.getHandler(), context.getClass()]) ?? false
    }
}
