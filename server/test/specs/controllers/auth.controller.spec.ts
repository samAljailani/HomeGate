import { AuthService } from '@/api/services/auth.service'
import { OAuthProviderManagementService } from '@/api/services/oauthProviderManagement.service'
import { createAuthServiceMock } from '../../mocks/auth.service.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { AuthController } from '@/api/controllers/auth.controller'
import { Test, TestingModule } from '@nestjs/testing'
import { createOAuthUserProfileFixture } from '../../fixtures/auth.stub'
import { createRequestMock, createResponseMock } from '../../mocks/httpContext.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import { clientRoutes } from '@/api/controllers/client-routes'
import { NotFoundException } from '@nestjs/common'
import { OAuthAuthModel } from '@/types/models/oauthAuth'
import { OAuthProviderName } from '@prisma/generated'

function createOAuthProviderManagementServiceMock(): jest.Mocked<Pick<OAuthProviderManagementService, 'listEnabledNames'>> {
    return {
        listEnabledNames: jest.fn(),
    }
}

function createOAuthAuthResultFixture(overrides: Partial<OAuthAuthModel> = {}): OAuthAuthModel {
    const user = createUserFixture()
    return { id: user.id, username: user.username, isAdmin: user.isAdmin, providerId: 1, ...overrides }
}

describe('AuthController', () => {
    let controller: AuthController
    let authServiceMock: ReturnType<typeof createAuthServiceMock>
    let oauthProviderManagementMock: ReturnType<typeof createOAuthProviderManagementServiceMock>
    let loggingProviderMock: ReturnType<typeof createLoggerMock>
    let expressRequestMock: ReturnType<typeof createRequestMock>
    let expressResponseMock: ReturnType<typeof createResponseMock>

    beforeEach(async () => {
        authServiceMock = createAuthServiceMock()
        oauthProviderManagementMock = createOAuthProviderManagementServiceMock()
        loggingProviderMock = createLoggerMock()
        expressRequestMock = createRequestMock()
        expressResponseMock = createResponseMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: AuthService, useValue: authServiceMock },
                { provide: OAuthProviderManagementService, useValue: oauthProviderManagementMock },
                { provide: LoggingProvider, useValue: loggingProviderMock },
                AuthController,
            ],
        }).compile()

        controller = module.get<AuthController>(AuthController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    // #region getEnabledProviders

    describe('getEnabledProviders', () => {
        it('returns the enabled provider names from the service', async () => {
            oauthProviderManagementMock.listEnabledNames.mockResolvedValue([OAuthProviderName.google])

            const result = await controller.getEnabledProviders()

            expect(oauthProviderManagementMock.listEnabledNames).toHaveBeenCalled()
            expect(result).toEqual([OAuthProviderName.google])
        })
    })

    // #endregion getEnabledProviders

    // #region join

    describe('join', () => {
        describe('when token is missing', () => {
            it('redirects to sign-in with missing_token error', async () => {
                await controller.join(undefined as any, expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(
                    expect.stringContaining('error=missing_token')
                )
            })

            it('does not begin sign-up', async () => {
                await controller.join(undefined as any, expressRequestMock, expressResponseMock)

                expect(authServiceMock.beginSignUp).not.toHaveBeenCalled()
            })
        })

        describe('when token is invalid', () => {
            it('redirects to sign-in with invalid_invite error', async () => {
                authServiceMock.beginSignUp.mockRejectedValue(new NotFoundException())

                await controller.join('bad-token', expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(
                    expect.stringContaining('error=invalid_invite')
                )
            })
        })

        describe('when token is valid', () => {
            it('stores oauthTransaction in session and redirects to the sign-in page', async () => {
                const expiresAt = new Date(Date.now() + 600_000)
                authServiceMock.beginSignUp.mockResolvedValue({ inviteId: 'invite-id-123', expiresAt })

                await controller.join('valid-token', expressRequestMock, expressResponseMock)

                expect(authServiceMock.beginSignUp).toHaveBeenCalledWith('valid-token')
                expect(expressRequestMock.session.regenerate).toHaveBeenCalled()
                expect(expressRequestMock.session.oauthTransaction).toEqual({
                    inviteToken: 'valid-token',
                    inviteId: 'invite-id-123',
                    expiresAt,
                })
                expect(expressRequestMock.session.save).toHaveBeenCalled()
                expect(expressResponseMock.redirect).toHaveBeenCalledWith(clientRoutes.signIn)
            })

            it('does not set userId on the session', async () => {
                authServiceMock.beginSignUp.mockResolvedValue({
                    inviteId: 'invite-id-123',
                    expiresAt: new Date(Date.now() + 600_000),
                })

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
                expect(expressResponseMock.redirect).toHaveBeenCalledWith(expect.stringContaining('error=auth_failed'))
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

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(expect.stringContaining('error=auth_failed'))
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
            expressRequestMock.user = createOAuthUserProfileFixture()
            expressRequestMock.session.oauthTransaction = {
                inviteToken: 'raw-token',
                inviteId: 'invite-id-123',
                expiresAt: new Date(Date.now() + 86400_000),
            }
        })

        describe('when the sign-up window has expired', () => {
            beforeEach(() => {
                expressRequestMock.session.oauthTransaction = {
                    inviteToken: 'raw-token',
                    inviteId: 'invite-id-123',
                    expiresAt: new Date(Date.now() - 1000),
                }
            })

            it('redirects to sign-in with invite_expired error', async () => {
                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(
                    expect.stringContaining('error=invite_expired')
                )
            })

            it('clears the transaction and does not complete sign-up or authorize', async () => {
                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressRequestMock.session.oauthTransaction).toBeUndefined()
                expect(authServiceMock.completeSignUp).not.toHaveBeenCalled()
                expect(authServiceMock.authorize).not.toHaveBeenCalled()
            })
        })

        describe('when completeSignUp throws', () => {
            it('redirects to sign-in with auth_failed error', async () => {
                authServiceMock.completeSignUp.mockRejectedValue(new Error('invite expired'))

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(expect.stringContaining('error=auth_failed'))
            })

            it('does not call authorize', async () => {
                authServiceMock.completeSignUp.mockRejectedValue(new Error())

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(authServiceMock.authorize).not.toHaveBeenCalled()
            })
        })

        describe('when completeSignUp succeeds', () => {
            it('calls completeSignUp with the invite token from the session and the OAuth profile', async () => {
                authServiceMock.completeSignUp.mockResolvedValue(createOAuthAuthResultFixture())

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(authServiceMock.completeSignUp).toHaveBeenCalledWith('raw-token', expressRequestMock.user)
            })

            it('does not call authorize', async () => {
                authServiceMock.completeSignUp.mockResolvedValue(createOAuthAuthResultFixture())

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(authServiceMock.authorize).not.toHaveBeenCalled()
            })

            it('clears the transaction, regenerates session and sets user data', async () => {
                const result = createOAuthAuthResultFixture()
                authServiceMock.completeSignUp.mockResolvedValue(result)

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressRequestMock.session.oauthTransaction).toBeUndefined()
                expect(expressRequestMock.session.regenerate).toHaveBeenCalled()
                expect(expressRequestMock.session.save).toHaveBeenCalled()
                expect(expressRequestMock.session.userId).toBe(result.id)
                expect(expressRequestMock.session.username).toBe(result.username)
                expect(expressRequestMock.session.isAdmin).toBe(result.isAdmin)
                expect(expressRequestMock.session.authProviderId).toBe(result.providerId)
            })

            it('redirects to home', async () => {
                authServiceMock.completeSignUp.mockResolvedValue(createOAuthAuthResultFixture())

                await controller.googleAuthRedirect(expressRequestMock, expressResponseMock)

                expect(expressResponseMock.redirect).toHaveBeenCalledWith(clientRoutes.home)
            })
        })
    })

    // #endregion

    // #region logout

    describe('logout', () => {
        it('destroys session and responds with 204', async () => {
            expressRequestMock.session.userId = 'user-123'

            await controller.logout(expressRequestMock, expressResponseMock)

            expect(expressRequestMock.session.destroy).toHaveBeenCalled()
            expect(expressResponseMock.status).toHaveBeenCalledWith(204)
            expect(expressResponseMock.send).toHaveBeenCalled()
        })

        it('still responds with 204 if signOut throws', async () => {
            authServiceMock.signOut.mockRejectedValue(new Error('signOut failed'))

            await controller.logout(expressRequestMock, expressResponseMock)

            expect(expressResponseMock.status).toHaveBeenCalledWith(204)
            expect(expressResponseMock.send).toHaveBeenCalled()
        })
    })

    // #endregion
})
