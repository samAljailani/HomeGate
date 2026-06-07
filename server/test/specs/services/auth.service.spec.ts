import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@/api/services/auth.service'
import { UserService } from '@/api/services/user.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { IOAuthProviderRepository } from '@/data/repositories/IOAuthProviderRepository'
import { createUserFixture } from '../../fixtures/user.stub'
import { createOAuthProviderFixture } from '../../fixtures/oauthProvider.stub'
import { createOpenIDUserFixture } from '../../fixtures/openIdUser.stub'
import { createOAuthIdentityFixture } from '../../fixtures/oauthIdentity.stub'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserServiceMock } from '../../mocks/user.service.mock'
import { createOAuthProviderRepositoryMock } from '../../mocks/oauthProvider.repository.mock'

describe('AuthService', () => {
    let service: AuthService
    let userServiceMock: ReturnType<typeof createUserServiceMock>
    let loggerMock: ReturnType<typeof createLoggerMock>
    let oauthProviderRepositoryMock: ReturnType<typeof createOAuthProviderRepositoryMock>

    beforeEach(async () => {
        loggerMock = createLoggerMock()
        userServiceMock = createUserServiceMock()
        oauthProviderRepositoryMock = createOAuthProviderRepositoryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UserService, useValue: userServiceMock },
                { provide: LoggingProvider, useValue: loggerMock },
                { provide: IOAuthProviderRepository, useValue: oauthProviderRepositoryMock },
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
                userServiceMock.CreateUserOAuthIdentity.mockResolvedValue(identity)

                const result = await service.authorize(request)

                expect(result).toEqual(user)
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

                expect(result).toEqual(user)
            })
        })

        describe('when an unexpected error is thrown', () => {
            it('returns null without rethrowing', async () => {
                userServiceMock.getUserByEmail.mockRejectedValue(new Error('DB connection lost'))

                const result = await service.authorize(request)

                expect(result).toBeNull()
            })

            it('logs the error', async () => {
                userServiceMock.getUserByEmail.mockRejectedValue(new Error('DB connection lost'))

                await service.authorize(request)

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
