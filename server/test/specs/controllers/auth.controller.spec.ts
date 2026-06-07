import { AuthService } from '@/api/services/auth.service'
import { createAuthServiceMock } from '../../mocks/auth.service.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { AuthController } from '@/api/controllers/auth.controller'
import { Test, TestingModule } from '@nestjs/testing'
import { createOAuthUserProfileFixture } from '../../fixtures/auth.stub'
import { createRequestMock, createResponseMock } from '../../mocks/httpContext.mock'
import { createUserFixture } from '../../fixtures/user.stub'

describe('AuthController', () => {
    let controller: AuthController
    let authServiceMock: ReturnType<typeof createAuthServiceMock>
    let loggingProviderMock: ReturnType<typeof createLoggerMock>
    let expressRequestMock: ReturnType<typeof createRequestMock>
    let expressResponseMock: ReturnType<typeof createResponseMock>

    beforeEach(async () => {
        authServiceMock = createAuthServiceMock()
        loggingProviderMock = createLoggerMock()
        expressRequestMock = createRequestMock()
        expressResponseMock = createResponseMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: AuthService, useValue: authServiceMock },
                { provide: LoggingProvider, useValue: loggingProviderMock },
                AuthController,
            ],
        }).compile()

        controller = module.get<AuthController>(AuthController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    describe('googleAuthRedirect', () => {
        describe('when user is not authenticated', () => {
            it('does not create a session and redirects to sign-in with error', async () => {
                //Arrange
                authServiceMock.authorize.mockResolvedValue(null)

                //Act
                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                //Assert
                expect(expressRequestMock.session.regenerate).not.toHaveBeenCalled()
                expect(expressRequestMock.session.save).not.toHaveBeenCalled()
                expect(expressRequestMock.session.userId).toBeUndefined()
                expect(expressRequestMock.session.username).toBeUndefined()
                expect(expressRequestMock.session.isAdmin).toBeUndefined()
                expect(expressResponseMock.redirect).toHaveBeenCalledWith(expect.stringContaining('error=auth_failed'))
            })
        })

        describe('when user is authenticated', () => {
            it('session is created and attached to the response', async () => {
                //Arrange
                expressRequestMock.user = createOAuthUserProfileFixture()
                const user = createUserFixture()
                authServiceMock.authorize.mockResolvedValue(user)

                //Act
                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                //Assert
                expect(expressRequestMock.session.regenerate).toHaveBeenCalled()
                expect(expressRequestMock.session.save).toHaveBeenCalled()
                expect(expressRequestMock.session.userId).toBe(user.id)
                expect(expressRequestMock.session.username).toBe(user.username)
                expect(expressRequestMock.session.isAdmin).toBe(user.isAdmin)
                expect(expressResponseMock.redirect).toHaveBeenCalledWith(expect.not.stringContaining('error='))
            })
        })
    })
})
