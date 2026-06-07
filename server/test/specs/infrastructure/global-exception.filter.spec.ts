import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common'
import { GlobalExceptionFilter } from '@/infrastructure/global-exception.filter'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createRequestMock, createResponseMock } from '../../mocks/httpContext.mock'

function createMockHost(req: ReturnType<typeof createRequestMock>, res: ReturnType<typeof createResponseMock>): ArgumentsHost {
    return {
        switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue(req),
            getResponse: jest.fn().mockReturnValue(res),
        }),
    } as unknown as ArgumentsHost
}

describe('GlobalExceptionFilter', () => {
    let filter: GlobalExceptionFilter
    let loggerMock: ReturnType<typeof createLoggerMock>

    beforeEach(() => {
        loggerMock = createLoggerMock()
        filter = new GlobalExceptionFilter(loggerMock as any)
    })

    describe('when headers are already sent', () => {
        it('does not send another response', () => {
            const req = createRequestMock({ method: 'GET', url: '/test' } as any)
            const res = createResponseMock({ headersSent: true } as any)
            const host = createMockHost(req, res)

            filter.catch(new HttpException('error', 400), host)

            expect(res.status).not.toHaveBeenCalled()
            expect(res.json).not.toHaveBeenCalled()
        })
    })

    describe('when an HttpException is thrown', () => {
        it('responds with the exception status and message', () => {
            const req = createRequestMock({ method: 'GET', url: '/test' } as any)
            const res = createResponseMock()
            const host = createMockHost(req, res)

            filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host)

            expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Not found',
            }))
        })

        it('does not log 4xx errors', () => {
            const req = createRequestMock({ method: 'GET', url: '/test' } as any)
            const res = createResponseMock()
            const host = createMockHost(req, res)

            filter.catch(new HttpException('Bad request', HttpStatus.BAD_REQUEST), host)

            expect(loggerMock.error).not.toHaveBeenCalled()
        })
    })

    describe('when a 5xx HttpException is thrown', () => {
        it('logs the error', () => {
            const req = createRequestMock({ method: 'GET', url: '/test' } as any)
            const res = createResponseMock()
            const host = createMockHost(req, res)

            filter.catch(new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR), host)

            expect(loggerMock.error).toHaveBeenCalled()
        })
    })

    describe('when a non-HTTP exception is thrown', () => {
        it('responds with 500 and logs the error', () => {
            const req = createRequestMock({ method: 'GET', url: '/test' } as any)
            const res = createResponseMock()
            const host = createMockHost(req, res)
            const error = new Error('Unexpected failure')

            filter.catch(error, host)

            expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            }))
            expect(loggerMock.error).toHaveBeenCalled()
        })
    })
})
