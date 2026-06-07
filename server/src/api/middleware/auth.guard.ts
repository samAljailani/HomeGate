import { IS_PUBLIC } from '@/decorators'
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
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ])

        if (isPublic) {
            return true
        }

        const request = context.switchToHttp().getRequest<Request>()

        if (!request.session?.userId) {
            request.session.destroy(() => {})
            return false
        }

        const user = await this.userRepository.findById(request.session.userId)

        if (!user || user.isDeleted) {
            request.session.destroy(() => {})
            return false
        }

        // express-session handles expired sessions.
        return true
    }
}
