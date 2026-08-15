import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@/api/services/auth.service'
import { UserService } from '@/api/services/user.service'
import { InviteService } from '@/api/services/invite.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { IOAuthProviderRepository } from '@/data/repositories/IOAuthProviderRepository'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { EnvRepository } from '@/data/repositories/env.repository'
import { createUserFixture } from '../../fixtures/user.stub'
import { createOAuthProviderFixture } from '../../fixtures/oauthProvider.stub'
import { createOpenIDUserFixture } from '../../fixtures/openIdUser.stub'
import { createOAuthIdentityFixture } from '../../fixtures/oauthIdentity.stub'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserServiceMock } from '../../mocks/user.service.mock'
import { createOAuthProviderRepositoryMock } from '../../mocks/oauthProvider.repository.mock'
import { createInviteServiceMock } from '../../mocks/invite.service.mock'

describe('AuthService', () => {
    let service: AuthService
    let userServiceMock: ReturnType<typeof createUserServiceMock>
    let loggerMock: ReturnType<typeof createLoggerMock>
    let oauthProviderRepositoryMock: ReturnType<typeof createOAuthProviderRepositoryMock>
    let inviteServiceMock: ReturnType<typeof createInviteServiceMock>

    beforeEach(async () => {
        loggerMock = createLoggerMock()
        userServiceMock = createUserServiceMock()
        oauthProviderRepositoryMock = createOAuthProviderRepositoryMock()
        inviteServiceMock = createInviteServiceMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UserService, useValue: userServiceMock },
                { provide: LoggingProvider, useValue: loggerMock },
                { provide: IOAuthProviderRepository, useValue: oauthProviderRepositoryMock },
                { provide: InviteService, useValue: inviteServiceMock },
                { provide: EnvRepository, useValue: { getEnv: () => ({ session: { cookieName: 'sid' } }) } },
                { provide: EventEmitter2, useValue: { emit: jest.fn() } },
            ],
        }).compile()

        service = module.get<AuthService>(AuthService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('authorize', () => {
        const request = createOpenIDUserFixture()
        const user = createUserFixture()
        const provider = createOAuthProviderFixture()
        const identity = createOAuthIdentityFixture()

        describe('when the user is not registered', () => {
            it('returns null', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(null)

                const result = await service.authorize(request)

                expect(result).toBeNull()
            })
        })

        describe('when the user is soft-deleted', () => {
            it('returns null', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue({ ...user, isDeleted: true })

                const result = await service.authorize(request)

                expect(result).toBeNull()
            })
        })

        describe('when the OAuth provider is not found', () => {
            it('returns null', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(user)
                oauthProviderRepositoryMock.findByName.mockResolvedValue(null)

                const result = await service.authorize(request)

                expect(result).toBeNull()
            })
        })

        describe('when the OAuth provider is disabled', () => {
            it('returns null', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(user)
                oauthProviderRepositoryMock.findByName.mockResolvedValue(createOAuthProviderFixture({ enabled: false }))

                const result = await service.authorize(request)

                expect(result).toBeNull()
            })

            it('does not attempt to look up or create an identity', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(user)
                oauthProviderRepositoryMock.findByName.mockResolvedValue(createOAuthProviderFixture({ enabled: false }))

                await service.authorize(request)

                expect(userServiceMock.getUserOAuthIdentity).not.toHaveBeenCalled()
                expect(userServiceMock.CreateUserOAuthIdentity).not.toHaveBeenCalled()
            })
        })

        describe('when the user has no existing OAuth identity', () => {
            it('creates a new identity', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(user)
                oauthProviderRepositoryMock.findByName.mockResolvedValue(provider)
                userServiceMock.getUserOAuthIdentity.mockResolvedValue(null)
                userServiceMock.hasIdentityForProvider.mockResolvedValue(false)
                userServiceMock.CreateUserOAuthIdentity.mockResolvedValue(identity)

                await service.authorize(request)

                expect(userServiceMock.CreateUserOAuthIdentity).toHaveBeenCalledWith({
                    userId: user.id,
                    providerId: provider.id,
                    profileId: request.providerAccountId,
                })
            })

            it('returns the user', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(user)
                oauthProviderRepositoryMock.findByName.mockResolvedValue(provider)
                userServiceMock.getUserOAuthIdentity.mockResolvedValue(null)
                userServiceMock.hasIdentityForProvider.mockResolvedValue(false)
                userServiceMock.CreateUserOAuthIdentity.mockResolvedValue(identity)

                const result = await service.authorize(request)

                expect(result).toEqual({
                    id: user.id,
                    username: user.username,
                    isAdmin: user.isAdmin,
                    providerId: provider.id,
                })
            })
        })

        describe('when the user has an identity for the provider with a different profileId', () => {
            it('does not create a new identity', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(user)
                oauthProviderRepositoryMock.findByName.mockResolvedValue(provider)
                userServiceMock.getUserOAuthIdentity.mockResolvedValue(null)
                userServiceMock.hasIdentityForProvider.mockResolvedValue(true)

                await service.authorize(request)

                expect(userServiceMock.CreateUserOAuthIdentity).not.toHaveBeenCalled()
            })

            it('returns null', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(user)
                oauthProviderRepositoryMock.findByName.mockResolvedValue(provider)
                userServiceMock.getUserOAuthIdentity.mockResolvedValue(null)
                userServiceMock.hasIdentityForProvider.mockResolvedValue(true)

                const result = await service.authorize(request)

                expect(result).toBeNull()
            })
        })

        describe('when the user already has an OAuth identity', () => {
            it('does not create a new identity', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(user)
                oauthProviderRepositoryMock.findByName.mockResolvedValue(provider)
                userServiceMock.getUserOAuthIdentity.mockResolvedValue(identity)

                await service.authorize(request)

                expect(userServiceMock.CreateUserOAuthIdentity).not.toHaveBeenCalled()
            })

            it('returns the user', async () => {
                userServiceMock.getUserByEmail.mockResolvedValue(user)
                oauthProviderRepositoryMock.findByName.mockResolvedValue(provider)
                userServiceMock.getUserOAuthIdentity.mockResolvedValue(identity)

                const result = await service.authorize(request)

                expect(result).toEqual({
                    id: user.id,
                    username: user.username,
                    isAdmin: user.isAdmin,
                    providerId: provider.id,
                })
            })
        })

        describe('when an unexpected error is thrown', () => {
            it('rethrows the error', async () => {
                const error = new Error('DB connection lost')
                userServiceMock.getUserByEmail.mockRejectedValue(error)

                await expect(service.authorize(request)).rejects.toThrow('DB connection lost')
            })

            it('logs the error', async () => {
                userServiceMock.getUserByEmail.mockRejectedValue(new Error('DB connection lost'))

                await service.authorize(request).catch(() => {})

                expect(loggerMock.error).toHaveBeenCalled()
            })
        })
    })

    describe('signOut', () => {
        it('resolves when userId and username are provided', async () => {
            await expect(service.signOut('user-uuid', 'testuser')).resolves.not.toThrow()
        })

        it('resolves when only userId is provided', async () => {
            await expect(service.signOut('user-uuid')).resolves.not.toThrow()
        })

        it('resolves when neither userId nor username are provided', async () => {
            await expect(service.signOut(undefined)).resolves.not.toThrow()
        })

        it('logs the logout event', async () => {
            await service.signOut('user-uuid', 'testuser')

            expect(loggerMock.log).toHaveBeenCalled()
        })
    })
})
