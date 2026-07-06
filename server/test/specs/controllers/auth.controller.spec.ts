import { AuthService } from '@/api/services/auth.service'
import { InviteService } from '@/api/services/invite.service'
import { createAuthServiceMock } from '../../mocks/auth.service.mock'
import { createInviteServiceMock } from '../../mocks/invite.service.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { AuthController } from '@/api/controllers/auth.controller'
import { Test, TestingModule } from '@nestjs/testing'
import { createOAuthUserProfileFixture } from '../../fixtures/auth.stub'
import { createRequestMock, createResponseMock } from '../../mocks/httpContext.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import { createInviteFixture } from '../../fixtures/invite.stub'
import { clientRoutes, routes } from '@/types/dtos/routes'
import { NotFoundException } from '@nestjs/common'
import { OAuthAuthModel } from '@/types/models/oauthAuth'

function createOAuthAuthResultFixture(overrides: Partial<OAuthAuthModel> = {}): OAuthAuthModel {
    const user = createUserFixture()
    return { id: user.id, username: user.username, isAdmin: user.isAdmin, providerId: 1, ...overrides }
}

describe('AuthController', () => {
    let controller: AuthController
    let authServiceMock: ReturnType<typeof createAuthServiceMock>
    let inviteServiceMock: ReturnType<typeof createInviteServiceMock>
    let loggingProviderMock: ReturnType<typeof createLoggerMock>
    let expressRequestMock: ReturnType<typeof createRequestMock>
    let expressResponseMock: ReturnType<typeof createResponseMock>

    beforeEach(async () => {
        authServiceMock = createAuthServiceMock()
        inviteServiceMock = createInviteServiceMock()
        loggingProviderMock = createLoggerMock()
        expressRequestMock = createRequestMock()
        expressResponseMock = createResponseMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: AuthService, useValue: authServiceMock },
                { provide: InviteService, useValue: inviteServiceMock },
                { provide: LoggingProvider, useValue: loggingProviderMock },
                AuthController,
            ],
        }).compile()

        controller = module.get<AuthController>(AuthController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    // #region join

    describe('join', () => {
        describe('when token is missing', () => {
            it('redirects to sign-in with missing_token error', async () => {
                await controller.join(undefined as any, expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(
                    expect.stringContaining('error=missing_token')
                )
            })

            it('does not validate the token', async () => {
                await controller.join(undefined as any, expressRequestMock, expressResponseMock)

                expect(inviteServiceMock.validateToken).not.toHaveBeenCalled()
            })
        })

        describe('when token is invalid', () => {
            it('redirects to sign-in with invalid_invite error', async () => {
                inviteServiceMock.validateToken.mockRejectedValue(new NotFoundException())

                await controller.join('bad-token', expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(
                    expect.stringContaining('error=invalid_invite')
                )
            })
        })

        describe('when token is valid', () => {
            it('stores oauthTransaction in session and redirects to google', async () => {
                const invite = createInviteFixture()
                inviteServiceMock.validateToken.mockResolvedValue(invite)

                await controller.join('valid-token', expressRequestMock, expressResponseMock)

                expect(expressRequestMock.session.regenerate).toHaveBeenCalled()
                expect(expressRequestMock.session.oauthTransaction).toEqual({
                    inviteToken: 'valid-token',
                    inviteId: invite.id,
                    expiresAt: invite.expiresAt,
                })
                expect(expressRequestMock.session.save).toHaveBeenCalled()
                expect(expressResponseMock.redirect).toHaveBeenCalledWith(routes.auth.google)
            })

            it('does not set userId on the session', async () => {
                const invite = createInviteFixture()
                inviteServiceMock.validateToken.mockResolvedValue(invite)

                await controller.join('valid-token', expressRequestMock, expressResponseMock)

                expect(expressRequestMock.session.userId).toBeUndefined()
            })
        })
    })

    // #endregion

    // #region googleAuthRedirect — login flow

    describe('googleAuthRedirect (login flow)', () => {
        describe('when authorize returns null', () => {
            it('redirects to sign-in with auth_failed error', async () => {
                authServiceMock.authorize.mockResolvedValue(null)

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressRequestMock.session.regenerate).not.toHaveBeenCalled()
                expect(expressResponseMock.redirect).toHaveBeenCalledWith(
                    expect.stringContaining('error=auth_failed')
                )
            })

            it('does not set session data', async () => {
                authServiceMock.authorize.mockResolvedValue(null)

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressRequestMock.session.userId).toBeUndefined()
                expect(expressRequestMock.session.username).toBeUndefined()
                expect(expressRequestMock.session.isAdmin).toBeUndefined()
            })
        })

        describe('when authorize throws', () => {
            it('redirects to sign-in with auth_failed error', async () => {
                authServiceMock.authorize.mockRejectedValue(new Error('db error'))

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(
                    expect.stringContaining('error=auth_failed')
                )
            })
        })

        describe('when authorize succeeds', () => {
            it('regenerates session and sets user data', async () => {
                expressRequestMock.user = createOAuthUserProfileFixture()
                const result = createOAuthAuthResultFixture()
                authServiceMock.authorize.mockResolvedValue(result)

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressRequestMock.session.regenerate).toHaveBeenCalled()
                expect(expressRequestMock.session.save).toHaveBeenCalled()
                expect(expressRequestMock.session.userId).toBe(result.id)
                expect(expressRequestMock.session.username).toBe(result.username)
                expect(expressRequestMock.session.isAdmin).toBe(result.isAdmin)
                expect(expressRequestMock.session.authProviderId).toBe(result.providerId)
            })

            it('redirects to home', async () => {
                expressRequestMock.user = createOAuthUserProfileFixture()
                authServiceMock.authorize.mockResolvedValue(createOAuthAuthResultFixture())

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(clientRoutes.home)
            })
        })
    })

    // #endregion

    // #region googleAuthRedirect — signup flow

    describe('googleAuthRedirect (signup flow)', () => {
        beforeEach(() => {
            expressRequestMock.session.oauthTransaction = {
                inviteToken: 'raw-token',
                inviteId: 'invite-id-123',
                expiresAt: new Date(Date.now() + 86400_000),
            }
        })

        describe('when signUp returns null', () => {
            it('redirects to sign-in with auth_failed error', async () => {
                authServiceMock.signUp.mockResolvedValue(null as any)

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(
                    expect.stringContaining('error=auth_failed')
                )
            })
        })

        describe('when signUp throws', () => {
            it('redirects to sign-in with auth_failed error', async () => {
                authServiceMock.signUp.mockRejectedValue(new Error('invite expired'))

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(
                    expect.stringContaining('error=auth_failed')
                )
            })

            it('does not call authorize', async () => {
                authServiceMock.signUp.mockRejectedValue(new Error())

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(authServiceMock.authorize).not.toHaveBeenCalled()
            })
        })

        describe('when signUp succeeds', () => {
            it('calls signUp with the invite token from the session', async () => {
                expressRequestMock.user = createOAuthUserProfileFixture()
                authServiceMock.signUp.mockResolvedValue(createOAuthAuthResultFixture())

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(authServiceMock.signUp).toHaveBeenCalledWith('raw-token', expressRequestMock.user)
            })

            it('does not call authorize', async () => {
                authServiceMock.signUp.mockResolvedValue(createOAuthAuthResultFixture())

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(authServiceMock.authorize).not.toHaveBeenCalled()
            })

            it('regenerates session and sets user data', async () => {
                expressRequestMock.user = createOAuthUserProfileFixture()
                const result = createOAuthAuthResultFixture()
                authServiceMock.signUp.mockResolvedValue(result)

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressRequestMock.session.regenerate).toHaveBeenCalled()
                expect(expressRequestMock.session.save).toHaveBeenCalled()
                expect(expressRequestMock.session.userId).toBe(result.id)
                expect(expressRequestMock.session.username).toBe(result.username)
                expect(expressRequestMock.session.isAdmin).toBe(result.isAdmin)
                expect(expressRequestMock.session.authProviderId).toBe(result.providerId)
            })

            it('redirects to home', async () => {
                authServiceMock.signUp.mockResolvedValue(createOAuthAuthResultFixture())

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(clientRoutes.home)
            })
        })
    })

    // #endregion

    // #region logout

    describe('logout', () => {
        it('destroys session and redirects to sign-in', async () => {
            expressRequestMock.session.userId = 'user-123'

            await controller.logout(expressRequestMock, expressResponseMock)

            expect(expressRequestMock.session.destroy).toHaveBeenCalled()
            expect(expressResponseMock.redirect).toHaveBeenCalledWith(clientRoutes.signIn)
        })

        it('still redirects to sign-in if signOut throws', async () => {
            authServiceMock.signOut.mockRejectedValue(new Error('signOut failed'))

            await controller.logout(expressRequestMock, expressResponseMock)

            expect(expressResponseMock.redirect).toHaveBeenCalledWith(clientRoutes.signIn)
        })
    })

    // #endregion
})

