import { Test, TestingModule } from '@nestjs/testing'
import { UserService } from '@/api/services/user.service'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { IUserRepository } from '@/data/repositories/IUserRepository'
import { IUserOAuthIdentityRepository, ISessionRepository } from '@/data/repositories'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserFixture } from '../../fixtures/user.stub'

function createUserRepositoryMock(): jest.Mocked<
    Pick<IUserRepository, 'findById' | 'softDelete' | 'hardDelete' | 'setEnabled' | 'findMany'>
> {
    return {
        findById: jest.fn(),
        softDelete: jest.fn(),
        hardDelete: jest.fn(),
        setEnabled: jest.fn(),
        findMany: jest.fn(),
    }
}

function createSessionRepositoryMock(): jest.Mocked<Pick<ISessionRepository, 'deleteByUserId'>> {
    return {
        deleteByUserId: jest.fn(),
    }
}

function createOAuthIdentityRepositoryMock(): jest.Mocked<
    Pick<IUserOAuthIdentityRepository, 'find' | 'findMany' | 'create'>
> {
    return {
        find: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
    }
}

function createSubscriptionServiceMock(): jest.Mocked<Pick<SubscriptionService, 'disableAllForUser'>> {
    return {
        disableAllForUser: jest.fn(),
    }
}

describe('UserService', () => {
    let service: UserService
    let userRepositoryMock: ReturnType<typeof createUserRepositoryMock>
    let sessionRepositoryMock: ReturnType<typeof createSessionRepositoryMock>
    let subscriptionServiceMock: ReturnType<typeof createSubscriptionServiceMock>
    let loggerMock: ReturnType<typeof createLoggerMock>

    beforeEach(async () => {
        userRepositoryMock = createUserRepositoryMock()
        sessionRepositoryMock = createSessionRepositoryMock()
        subscriptionServiceMock = createSubscriptionServiceMock()
        loggerMock = createLoggerMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: IUserRepository, useValue: userRepositoryMock },
                { provide: IUserOAuthIdentityRepository, useValue: createOAuthIdentityRepositoryMock() },
                { provide: LoggingProvider, useValue: loggerMock },
                { provide: SubscriptionService, useValue: subscriptionServiceMock },
                { provide: ISessionRepository, useValue: sessionRepositoryMock },
            ],
        }).compile()

        service = module.get<UserService>(UserService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    // #region softDeleteUser

    describe('softDeleteUser', () => {
        const userId = 'user-uuid-1'

        beforeEach(() => {
            subscriptionServiceMock.disableAllForUser.mockResolvedValue(undefined)
            sessionRepositoryMock.deleteByUserId.mockResolvedValue(undefined)
            userRepositoryMock.softDelete.mockResolvedValue(undefined)
        })

        it('disables all subscriptions before deleting', async () => {
            await service.softDeleteUser(userId)

            expect(subscriptionServiceMock.disableAllForUser).toHaveBeenCalledWith(userId)
        })

        it('cleans up sessions before soft deleting', async () => {
            await service.softDeleteUser(userId)

            expect(sessionRepositoryMock.deleteByUserId).toHaveBeenCalledWith(userId)
        })

        it('soft deletes the user', async () => {
            await service.softDeleteUser(userId)

            expect(userRepositoryMock.softDelete).toHaveBeenCalledWith(userId)
        })

        it('disables subscriptions before cleaning sessions', async () => {
            const order: string[] = []
            subscriptionServiceMock.disableAllForUser.mockImplementation(async () => {
                order.push('subscriptions')
            })
            sessionRepositoryMock.deleteByUserId.mockImplementation(async () => {
                order.push('sessions')
            })
            userRepositoryMock.softDelete.mockImplementation(async () => {
                order.push('softDelete')
            })

            await service.softDeleteUser(userId)

            expect(order).toEqual(['subscriptions', 'sessions', 'softDelete'])
        })
    })

    // #endregion softDeleteUser

    // #region hardDeleteUser

    describe('hardDeleteUser', () => {
        const userId = 'user-uuid-1'

        beforeEach(() => {
            userRepositoryMock.hardDelete.mockResolvedValue(undefined)
        })

        it('hard deletes the user', async () => {
            await service.hardDeleteUser(userId)

            expect(userRepositoryMock.hardDelete).toHaveBeenCalledWith(userId)
        })

        it('does not disable subscriptions', async () => {
            await service.hardDeleteUser(userId)

            expect(subscriptionServiceMock.disableAllForUser).not.toHaveBeenCalled()
        })

        it('does not clean up sessions', async () => {
            await service.hardDeleteUser(userId)

            expect(sessionRepositoryMock.deleteByUserId).not.toHaveBeenCalled()
        })
    })

    // #endregion hardDeleteUser

    // #region disableUser

    describe('disableUser', () => {
        const userId = 'user-uuid-1'

        beforeEach(() => {
            userRepositoryMock.setEnabled.mockResolvedValue(undefined)
        })

        it('calls setEnabled with false', async () => {
            await service.disableUser(userId)

            expect(userRepositoryMock.setEnabled).toHaveBeenCalledWith(userId, false)
        })
    })

    // #endregion disableUser

    // #region enableUser

    describe('enableUser', () => {
        const userId = 'user-uuid-1'

        beforeEach(() => {
            userRepositoryMock.setEnabled.mockResolvedValue(undefined)
        })

        it('calls setEnabled with true', async () => {
            await service.enableUser(userId)

            expect(userRepositoryMock.setEnabled).toHaveBeenCalledWith(userId, true)
        })
    })

    // #endregion enableUser

    // #region listUsers

    describe('listUsers', () => {
        it('returns mapped admin DTOs for all users', async () => {
            const users = [createUserFixture({ id: 'a' }), createUserFixture({ id: 'b' })]
            userRepositoryMock.findMany.mockResolvedValue(users)

            const result = await service.listUsers()

            expect(userRepositoryMock.findMany).toHaveBeenCalledWith({}, undefined, undefined)
            expect(result).toHaveLength(2)
            expect(result[0].id).toBe('a')
            expect(result[1].id).toBe('b')
        })

        it('returns empty array when no users exist', async () => {
            userRepositoryMock.findMany.mockResolvedValue([])

            const result = await service.listUsers()

            expect(result).toEqual([])
        })
    })

    // #endregion listUsers

    // #region getUserByIdForAdmin

    describe('getUserByIdForAdmin', () => {
        const userId = 'user-uuid-1'

        it('returns admin DTO when user exists', async () => {
            const user = createUserFixture({ id: userId })
            userRepositoryMock.findById.mockResolvedValue(user)

            const result = await service.getUserByIdForAdmin(userId)

            expect(userRepositoryMock.findById).toHaveBeenCalledWith(userId)
            expect(result).not.toBeNull()
            expect(result!.id).toBe(userId)
            expect(result).toHaveProperty('isEnabled')
            expect(result).toHaveProperty('isDeleted')
        })

        it('returns null when user does not exist', async () => {
            userRepositoryMock.findById.mockResolvedValue(null)

            const result = await service.getUserByIdForAdmin(userId)

            expect(result).toBeNull()
        })
    })

    // #endregion getUserByIdForAdmin
})
