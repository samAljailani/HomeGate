import { Catch, ExceptionFilter, ArgumentsHost, HttpException, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import type { Response } from 'express'
import { clientRoutes } from '@/types/dtos/routes'

@Catch(HttpException)
export class ClientRouteExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const res = host.switchToHttp().getResponse<Response>()
        const status = exception.getStatus()

        if (exception instanceof UnauthorizedException || exception instanceof ForbiddenException) {
            return res.redirect(clientRoutes.signIn)
        }

        return res.redirect(`${clientRoutes.error}?status=${status}`)
    }
}
