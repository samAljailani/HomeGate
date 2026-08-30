import { Test, TestingModule } from '@nestjs/testing'
import { ForwardAuthController } from '@/api/controllers/forwardAuth.controller'
import { ForwardAuthService } from '@/api/services/forwardAuth.service'
import { EnvRepository } from '@/data/repositories/env.repository'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createReferencedServiceFixture } from '../../fixtures/service.stub'
import { createRequestMock, createResponseMock } from '../../mocks/httpContext.mock'

const HOME_URL = 'https://home.example.com'
const APP_HOST = 'jellyfin.example.com'

function createEnvRepositoryMock() {
    return { getEnv: jest.fn().mockReturnValue({ host: HOME_URL }) }
}

function createForwardAuthServiceMock() {
    return {
        resolveService: jest.fn().mockResolvedValue(null),
        isAuthorized: jest.fn(),
    }
}

describe('ForwardAuthController', () => {
    let controller: ForwardAuthController
    let forwardAuthMock: ReturnType<typeof createForwardAuthServiceMock>

    beforeEach(async () => {
        forwardAuthMock = createForwardAuthServiceMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ForwardAuthController,
                { provide: ForwardAuthService, useValue: forwardAuthMock },
                { provide: EnvRepository, useValue: createEnvRepositoryMock() },
                { provide: LoggingProvider, useValue: createLoggerMock() },
            ],
        }).compile()

        controller = module.get(ForwardAuthController)
    })

    describe('forward', () => {
        it('returns 400 when no forwarded host is present', async () => {
            const req = createRequestMock({ headers: { accept: 'text/html' } })
            const res = createResponseMock()

            await controller.forward(req, res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.send).toHaveBeenCalled()
        })

        it('redirects an unauthenticated navigation to sign-in with the app return url and name', async () => {
            forwardAuthMock.resolveService.mockResolvedValue(createReferencedServiceFixture({ name: 'Jellyseerr' }))
            const req = createRequestMock({
                headers: {
                    'x-forwarded-host': APP_HOST,
                    'x-forwarded-uri': '/web/',
                    'x-forwarded-proto': 'https',
                    accept: 'text/html',
                },
            })
            const res = createResponseMock()

            await controller.forward(req, res)

            expect(forwardAuthMock.resolveService).toHaveBeenCalledWith(APP_HOST)
            expect(req.session.returnUrl).toBe('https://jellyfin.example.com/web/')

            const location = res.redirect.mock.calls[0]?.[1] as string
            const target = new URL(location)
            expect(`${target.origin}${target.pathname}`).toBe(`${HOME_URL}/signin`)
            expect(target.searchParams.get('returnUrl')).toBe('https://jellyfin.example.com/web/')
            expect(target.searchParams.get('appName')).toBe('Jellyseerr')
        })

        it('redirects to a plain sign-in when the host does not match a service', async () => {
            const req = createRequestMock({
                headers: {
                    'x-forwarded-host': 'home.example.com',
                    'x-forwarded-uri': '/',
                    accept: 'text/html',
                },
            })
            const res = createResponseMock()

            await controller.forward(req, res)

            expect(req.session.returnUrl).toBeUndefined()
            expect(res.redirect).toHaveBeenCalledWith(302, `${HOME_URL}/signin`)
        })

        it('returns 401 for unauthenticated non-navigation requests', async () => {
            const req = createRequestMock({
                headers: {
                    'x-forwarded-host': APP_HOST,
                    accept: 'application/json',
                },
            })
            const res = createResponseMock()

            await controller.forward(req, res)

            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.send).toHaveBeenCalled()
        })

        it('allows a request when the user has an authorized session', async () => {
            forwardAuthMock.resolveService.mockResolvedValue(
                createReferencedServiceFixture({ name: 'Jellyseerr', url: 'https://jellyfin.example.com' })
            )
            forwardAuthMock.isAuthorized.mockResolvedValue(true)
            const req = createRequestMock({
                headers: { 'x-forwarded-host': APP_HOST, accept: 'text/html' },
            })
            req.session.userId = 'user-1'
            const res = createResponseMock()

            await controller.forward(req, res)

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.send).toHaveBeenCalled()
            expect(res.redirect).not.toHaveBeenCalled()
        })

        it('redirects a denied navigation to the HomeGate error page with a toast payload', async () => {
            forwardAuthMock.resolveService.mockResolvedValue(
                createReferencedServiceFixture({ name: 'Jellyseerr', url: 'https://jellyfin.example.com' })
            )
            forwardAuthMock.isAuthorized.mockResolvedValue(false)
            const req = createRequestMock({
                headers: { 'x-forwarded-host': APP_HOST, accept: 'text/html' },
            })
            req.session.userId = 'user-1'
            const res = createResponseMock()

            await controller.forward(req, res)

            expect(res.redirect).toHaveBeenCalledWith(302, `${HOME_URL}/error?error=access_denied&appName=Jellyseerr`)
        })

        it('returns 403 for a denied non-navigation request', async () => {
            forwardAuthMock.resolveService.mockResolvedValue(
                createReferencedServiceFixture({ name: 'Jellyseerr', url: 'https://jellyfin.example.com' })
            )
            forwardAuthMock.isAuthorized.mockResolvedValue(false)
            const req = createRequestMock({
                headers: { 'x-forwarded-host': APP_HOST, accept: 'application/json' },
            })
            req.session.userId = 'user-1'
            const res = createResponseMock()

            await controller.forward(req, res)

            expect(res.status).toHaveBeenCalledWith(403)
            expect(res.send).toHaveBeenCalled()
        })

        it('redirects a navigation for an unresolvable service to the error page naming the host', async () => {
            const req = createRequestMock({
                headers: { 'x-forwarded-host': 'unknown.example.com', accept: 'text/html' },
            })
            req.session.userId = 'user-1'
            const res = createResponseMock()

            await controller.forward(req, res)

            expect(res.redirect).toHaveBeenCalledWith(
                302,
                `${HOME_URL}/error?error=access_denied&appName=unknown.example.com`
            )
        })

        it('denies a non-navigation request when the service cannot be resolved', async () => {
            const req = createRequestMock({
                headers: { 'x-forwarded-host': 'unknown.example.com', accept: 'application/json' },
            })
            req.session.userId = 'user-1'
            const res = createResponseMock()

            await controller.forward(req, res)

            expect(res.status).toHaveBeenCalledWith(403)
            expect(res.send).toHaveBeenCalled()
        })
    })
})
