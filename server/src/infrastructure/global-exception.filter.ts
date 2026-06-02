import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Inject } from '@nestjs/common'
import type { Request, Response } from 'express'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    constructor(@Inject(LoggingProvider) private readonly logger: LoggingProvider) {
        this.logger.setContext(GlobalExceptionFilter.name)
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        const request = ctx.getRequest<Request>()

        const isHttp = exception instanceof HttpException
        const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
        const message = isHttp ? exception.getResponse() : 'Internal server error'

        if (!isHttp || status >= 500) {
            this.logger.error(`Unhandled exception on ${request.method} ${request.url}`, {
                stackTrace: exception instanceof Error ? exception.stack : undefined,
            })
        }

        // If headers already sent (e.g. redirect endpoints), nothing more to do
        if (response.headersSent) return

        response.status(status).json({
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        })
    }
}
