import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { UserController } from '@/api/controllers/user.controller'
import { UserService } from '@/api/services/user.service'
import { UserDeleteRequestDto, UserLoadRequestDto } from '@/types/dtos/userDto'
import { createRequestMock } from '../../mocks/httpContext.mock'
import { createUserFixture } from '../../fixtures/user.stub'

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

    describe('deleteUser (softDelete: true)', () => {
        const targetUserId = 'user-target-uuid'
        const request: UserDeleteRequestDto = { userId: targetUserId, softDelete: true }

        describe('when the requesting user is deleting themselves', () => {
            it('calls softDeleteUser', async () => {
                const req = createRequestMock()
                req.session.userId = targetUserId
                req.session.isAdmin = false

                await controller.deleteUser(request, req)

                expect(userServiceMock.softDeleteUser).toHaveBeenCalledWith(targetUserId)
            })
        })

        describe('when an admin deletes another user', () => {
            it('calls softDeleteUser', async () => {
                const req = createRequestMock()
                req.session.userId = 'admin-uuid'
                req.session.isAdmin = true

                await controller.deleteUser(request, req)

                expect(userServiceMock.softDeleteUser).toHaveBeenCalledWith(targetUserId)
            })
        })

        describe('when a non-admin tries to delete another user', () => {
            it('throws ForbiddenException', async () => {
                const req = createRequestMock()
                req.session.userId = 'other-user-uuid'
                req.session.isAdmin = false

                await expect(controller.deleteUser(request, req)).rejects.toThrow(ForbiddenException)
            })

            it('does not call softDeleteUser', async () => {
                const req = createRequestMock()
                req.session.userId = 'other-user-uuid'
                req.session.isAdmin = false

                await controller.deleteUser(request, req).catch(() => {})

                expect(userServiceMock.softDeleteUser).not.toHaveBeenCalled()
            })
        })
    })

    // #endregion

    // #region deleteUser — hard delete

    describe('deleteUser (softDelete: false)', () => {
        const targetUserId = 'user-target-uuid'
        const request: UserDeleteRequestDto = { userId: targetUserId, softDelete: false }

        describe('when the requesting user is an admin', () => {
            it('calls hardDeleteUser', async () => {
                const req = createRequestMock()
                req.session.userId = 'admin-uuid'
                req.session.isAdmin = true

                await controller.deleteUser(request, req)

                expect(userServiceMock.hardDeleteUser).toHaveBeenCalledWith(targetUserId)
            })
        })

        describe('when the requesting user is not an admin', () => {
            it('throws ForbiddenException', async () => {
                const req = createRequestMock()
                req.session.userId = targetUserId
                req.session.isAdmin = false

                await expect(controller.deleteUser(request, req)).rejects.toThrow(ForbiddenException)
            })

            it('does not call hardDeleteUser', async () => {
                const req = createRequestMock()
                req.session.userId = targetUserId
                req.session.isAdmin = false

                await controller.deleteUser(request, req).catch(() => {})

                expect(userServiceMock.hardDeleteUser).not.toHaveBeenCalled()
            })
        })
    })

    // #endregion

    // #region disableUser

    describe('disableUser', () => {
        const request: UserLoadRequestDto = { userId: 'user-uuid-1' }

        it('calls disableUser on the service', async () => {
            userServiceMock.disableUser.mockResolvedValue(undefined)

            await controller.disableUser(request)

            expect(userServiceMock.disableUser).toHaveBeenCalledWith('user-uuid-1')
        })
    })

    // #endregion

    // #region enableUser

    describe('enableUser', () => {
        const request: UserLoadRequestDto = { userId: 'user-uuid-1' }

        it('calls enableUser on the service', async () => {
            userServiceMock.enableUser.mockResolvedValue(undefined)

            await controller.enableUser(request)

            expect(userServiceMock.enableUser).toHaveBeenCalledWith('user-uuid-1')
        })
    })

    // #endregion

    // #region listUsers

    describe('listUsers', () => {
        it('returns the list from the service', async () => {
            const user = createUserFixture()
            userServiceMock.listUsers.mockResolvedValue([
                { ...user, isDeleted: false, isEnabled: true, createdAt: user.createdAt },
            ])

            const result = await controller.listUsers({})

            expect(userServiceMock.listUsers).toHaveBeenCalled()
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe(user.id)
        })
    })

    // #endregion

    // #region getUser

    describe('getUser', () => {
        const userId = 'user-uuid-1'

        it('returns the user when found', async () => {
            const user = createUserFixture({ id: userId })
            userServiceMock.getUserByIdForAdmin.mockResolvedValue({
                ...user,
                isDeleted: false,
                isEnabled: true,
            })

            const result = await controller.getUser(userId)

            expect(userServiceMock.getUserByIdForAdmin).toHaveBeenCalledWith(userId)
            expect(result.id).toBe(userId)
        })

        it('throws NotFoundException when user does not exist', async () => {
            userServiceMock.getUserByIdForAdmin.mockResolvedValue(null)

            await expect(controller.getUser(userId)).rejects.toThrow(NotFoundException)
        })
    })

    // #endregion
})
