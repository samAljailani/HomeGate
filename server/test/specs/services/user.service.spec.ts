import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { UserService } from '@/api/services/user.service'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { IUserRepository } from '@/data/repositories/IUserRepository'
import { IUserOAuthIdentityRepository, ISessionRepository } from '@/data/repositories'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import { UserStatus } from '@/types/models/user'

function createUserRepositoryMock(): jest.Mocked<
    Pick<IUserRepository, 'findById' | 'softDelete' | 'hardDelete' | 'setEnabled' | 'setAdmin' | 'findMany' | 'count'>
> {
    return {
        findById: jest.fn(),
        softDelete: jest.fn(),
        hardDelete: jest.fn(),
        setEnabled: jest.fn(),
        setAdmin: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
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
            userRepositoryMock.softDelete.mockResolvedValue(true)
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
                return true
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
            userRepositoryMock.hardDelete.mockResolvedValue(true)
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
            userRepositoryMock.setEnabled.mockResolvedValue(null)
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
            userRepositoryMock.setEnabled.mockResolvedValue(null)
        })

        it('calls setEnabled with true', async () => {
            await service.enableUser(userId)

            expect(userRepositoryMock.setEnabled).toHaveBeenCalledWith(userId, true)
        })
    })

    // #endregion enableUser

    // #region setUserAdmin

    describe('setUserAdmin', () => {
        const userId = 'user-uuid-1'
        const actorId = 'admin-user-uuid'

        beforeEach(() => {
            userRepositoryMock.setAdmin.mockResolvedValue(null)
        })

        describe('when granting admin', () => {
            it('calls setAdmin when the target user is active', async () => {
                userRepositoryMock.findById.mockResolvedValue(createUserFixture({ id: userId, status: UserStatus.ACTIVE }))

                await service.setUserAdmin(userId, true, actorId)

                expect(userRepositoryMock.setAdmin).toHaveBeenCalledWith(userId, true)
            })

            it('throws BadRequestException when the target user is not active', async () => {
                userRepositoryMock.findById.mockResolvedValue(createUserFixture({ id: userId, status: UserStatus.DISABLED }))

                await expect(service.setUserAdmin(userId, true, actorId)).rejects.toThrow(BadRequestException)
                expect(userRepositoryMock.setAdmin).not.toHaveBeenCalled()
            })

            it('throws BadRequestException when the target user does not exist', async () => {
                userRepositoryMock.findById.mockResolvedValue(null)

                await expect(service.setUserAdmin(userId, true, actorId)).rejects.toThrow(BadRequestException)
                expect(userRepositoryMock.setAdmin).not.toHaveBeenCalled()
            })
        })

        describe('when revoking admin', () => {
            it('calls setAdmin without checking the target user status', async () => {
                await service.setUserAdmin(userId, false, actorId)

                expect(userRepositoryMock.findById).not.toHaveBeenCalled()
                expect(userRepositoryMock.setAdmin).toHaveBeenCalledWith(userId, false)
            })
        })
    })

    // #endregion setUserAdmin

    // #region listUsers

    describe('listUsers', () => {
        it('returns paginated response with mapped admin DTOs', async () => {
            const users = [createUserFixture({ id: 'a' }), createUserFixture({ id: 'b' })]
            userRepositoryMock.findMany.mockResolvedValue(users)
            userRepositoryMock.count.mockResolvedValue(2)

            const result = await service.listUsers()

            expect(userRepositoryMock.findMany).toHaveBeenCalledWith({}, 50, 0)
            expect(result.data).toHaveLength(2)
            expect(result.data[0]!.id).toBe('a')
            expect(result.data[1]!.id).toBe('b')
            expect(result.total).toBe(2)
            expect(result.hasMore).toBe(false)
        })

        it('returns empty data when no users exist', async () => {
            userRepositoryMock.findMany.mockResolvedValue([])
            userRepositoryMock.count.mockResolvedValue(0)

            const result = await service.listUsers()

            expect(result.data).toEqual([])
            expect(result.total).toBe(0)
            expect(result.hasMore).toBe(false)
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
        })

        it('returns null when user does not exist', async () => {
            userRepositoryMock.findById.mockResolvedValue(null)

            const result = await service.getUserByIdForAdmin(userId)

            expect(result).toBeNull()
        })
    })

    // #endregion getUserByIdForAdmin
})
