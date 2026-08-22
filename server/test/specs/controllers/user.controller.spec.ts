import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { UserController } from '@/api/controllers/user.controller'
import { UserService } from '@/api/services/user.service'
import { createRequestMock } from '../../mocks/httpContext.mock'
import { createUserFixture } from '../../fixtures/user.stub'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'

function createUserServiceMock(): jest.Mocked<
    Pick<
        UserService,
        'softDeleteUser' | 'hardDeleteUser' | 'disableUser' | 'enableUser' | 'listUsers' | 'getUserByIdForAdmin'
    >
> {
    return {
        softDeleteUser: jest.fn(),
        hardDeleteUser: jest.fn(),
        disableUser: jest.fn(),
        enableUser: jest.fn(),
        listUsers: jest.fn(),
        getUserByIdForAdmin: jest.fn(),
    }
}

describe('UserController', () => {
    let controller: UserController
    let userServiceMock: ReturnType<typeof createUserServiceMock>

    beforeEach(async () => {
        userServiceMock = createUserServiceMock()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [{ provide: UserService, useValue: userServiceMock }],
        }).compile()

        controller = module.get<UserController>(UserController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    // #region deleteUser — soft delete

    describe('deleteUser (soft delete — hard not set)', () => {
        const targetUserId = 'user-target-uuid'

        describe('when the requesting user is deleting themselves', () => {
            it('calls softDeleteUser', async () => {
                const req = createRequestMock()
                req.session.userId = targetUserId
                req.session.isAdmin = false

                await controller.deleteUser({ id: targetUserId }, {}, req)

                expect(userServiceMock.softDeleteUser).toHaveBeenCalledWith(targetUserId)
            })
        })

        describe('when an admin deletes another user', () => {
            it('calls softDeleteUser', async () => {
                const req = createRequestMock()
                req.session.userId = 'admin-uuid'
                req.session.isAdmin = true

                await controller.deleteUser({ id: targetUserId }, {}, req)

                expect(userServiceMock.softDeleteUser).toHaveBeenCalledWith(targetUserId)
            })
        })

        describe('when a non-admin tries to delete another user', () => {
            it('throws ForbiddenException', async () => {
                const req = createRequestMock()
                req.session.userId = 'other-user-uuid'
                req.session.isAdmin = false

                await expect(controller.deleteUser({ id: targetUserId }, {}, req)).rejects.toThrow(ForbiddenException)
            })

            it('does not call softDeleteUser', async () => {
                const req = createRequestMock()
                req.session.userId = 'other-user-uuid'
                req.session.isAdmin = false

                await controller.deleteUser({ id: targetUserId }, {}, req).catch(() => {})

                expect(userServiceMock.softDeleteUser).not.toHaveBeenCalled()
            })
        })
    })

    // #endregion

    // #region deleteUser — hard delete

    describe('deleteUser (hard: true)', () => {
        const targetUserId = 'user-target-uuid'

        describe('when the requesting user is an admin', () => {
            it('calls hardDeleteUser', async () => {
                const req = createRequestMock()
                req.session.userId = 'admin-uuid'
                req.session.isAdmin = true

                await controller.deleteUser({ id: targetUserId }, { hard: true }, req)

                expect(userServiceMock.hardDeleteUser).toHaveBeenCalledWith(targetUserId)
            })
        })

        describe('when a non-admin passes hard: true', () => {
            it('soft-deletes their own account instead (hard flag ignored)', async () => {
                const req = createRequestMock()
                req.session.userId = targetUserId
                req.session.isAdmin = false

                await controller.deleteUser({ id: targetUserId }, { hard: true }, req)

                expect(userServiceMock.hardDeleteUser).not.toHaveBeenCalled()
                expect(userServiceMock.softDeleteUser).toHaveBeenCalledWith(targetUserId)
            })

            it('throws ForbiddenException when targeting another user', async () => {
                const req = createRequestMock()
                req.session.userId = 'other-user-uuid'
                req.session.isAdmin = false

                await expect(controller.deleteUser({ id: targetUserId }, { hard: true }, req)).rejects.toThrow(
                    ForbiddenException
                )
            })
        })
    })

    // #endregion

    // #region updateUser

    describe('updateUser', () => {
        const userId = 'user-uuid-1'

        it('enables the user when enabled is true', async () => {
            userServiceMock.enableUser.mockResolvedValue(null)

            await controller.updateUser({ id: userId }, { enabled: true })

            expect(userServiceMock.enableUser).toHaveBeenCalledWith(userId)
            expect(userServiceMock.disableUser).not.toHaveBeenCalled()
        })

        it('disables the user when enabled is false', async () => {
            userServiceMock.disableUser.mockResolvedValue(null)

            await controller.updateUser({ id: userId }, { enabled: false })

            expect(userServiceMock.disableUser).toHaveBeenCalledWith(userId)
            expect(userServiceMock.enableUser).not.toHaveBeenCalled()
        })

        it('does nothing when enabled is not provided', async () => {
            const userId2 = userId
            userServiceMock.getUserByIdForAdmin.mockResolvedValue(null)

            await controller.updateUser({ id: userId2 }, {})

            expect(userServiceMock.enableUser).not.toHaveBeenCalled()
            expect(userServiceMock.disableUser).not.toHaveBeenCalled()
            expect(userServiceMock.getUserByIdForAdmin).toHaveBeenCalledWith(userId2)
        })
    })

    // #endregion

    // #region listUsers

    describe('listUsers', () => {
        it('returns the list from the service', async () => {
            const user = createUserFixture()
            userServiceMock.listUsers.mockResolvedValue(
                new PaginatedResponseDto([{ ...user, createdAt: user.createdAt }], 1, 0)
            )

            const result = await controller.listUsers({})

            expect(userServiceMock.listUsers).toHaveBeenCalled()
            expect(result.data).toHaveLength(1)
            expect(result.data[0]!.id).toBe(user.id)
        })
    })

    // #endregion

    // #region getUser

    describe('getUser', () => {
        const userId = 'user-uuid-1'

        it('returns the user when found', async () => {
            const user = createUserFixture({ id: userId })
            userServiceMock.getUserByIdForAdmin.mockResolvedValue(user)

            const result = await controller.getUser({ id: userId })

            expect(userServiceMock.getUserByIdForAdmin).toHaveBeenCalledWith(userId)
            expect(result.id).toBe(userId)
        })

        it('throws NotFoundException when user does not exist', async () => {
            userServiceMock.getUserByIdForAdmin.mockResolvedValue(null)

            await expect(controller.getUser({ id: userId })).rejects.toThrow(NotFoundException)
        })
    })

    // #endregion
})
