import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@/api/middleware/auth.guard'
import { IUserRepository } from '@/data/repositories'
import { createRequestMock } from '../../mocks/httpContext.mock'
import { createUserFixture } from '../../fixtures/user.stub'

function createMockExecutionContext(req: ReturnType<typeof createRequestMock>, _isPublic?: boolean): ExecutionContext {
    return {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue(req),
        }),
    } as unknown as ExecutionContext
}

describe('AuthGuard', () => {
    let guard: AuthGuard
    let reflector: jest.Mocked<Reflector>
    let userRepository: jest.Mocked<Pick<IUserRepository, 'findById'>>

    beforeEach(() => {
        reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>
        userRepository = { findById: jest.fn() }
        guard = new AuthGuard(reflector, userRepository as unknown as IUserRepository)
    })

    describe('when route is public', () => {
        it('returns true without checking session', async () => {
            reflector.getAllAndOverride.mockReturnValue(true)
            const req = createRequestMock()
            const ctx = createMockExecutionContext(req)

            const result = await guard.canActivate(ctx)

            expect(result).toBe(true)
            expect(userRepository.findById).not.toHaveBeenCalled()
        })
    })

    describe('when route is not public', () => {
        beforeEach(() => {
            reflector.getAllAndOverride.mockReturnValue(false)
        })

        describe('when session has no userId', () => {
            it('destroys session and returns false', async () => {
                const req = createRequestMock()
                const ctx = createMockExecutionContext(req)

                const result = await guard.canActivate(ctx)

                expect(req.session.destroy).toHaveBeenCalled()
                expect(result).toBe(false)
            })
        })

        describe('when user does not exist', () => {
            it('destroys session and returns false', async () => {
                const req = createRequestMock()
                req.session.userId = 'xxx'
                const ctx = createMockExecutionContext(req)
                userRepository.findById.mockResolvedValue(null)

                const result = await guard.canActivate(ctx)

                expect(req.session.destroy).toHaveBeenCalled()
                expect(result).toBe(false)
            })
        })

        describe('when user is soft-deleted', () => {
            it('destroys session and returns false', async () => {
                const user = createUserFixture({ isDeleted: true })
                const req = createRequestMock()
                req.session.userId = user.id
                const ctx = createMockExecutionContext(req)
                userRepository.findById.mockResolvedValue(user)

                const result = await guard.canActivate(ctx)

                expect(req.session.destroy).toHaveBeenCalled()
                expect(result).toBe(false)
            })
        })

        describe('when user is disabled', () => {
            it('destroys session and returns false', async () => {
                const user = createUserFixture({ isEnabled: false })
                const req = createRequestMock()
                req.session.userId = user.id
                const ctx = createMockExecutionContext(req)
                userRepository.findById.mockResolvedValue(user)

                const result = await guard.canActivate(ctx)

                expect(req.session.destroy).toHaveBeenCalled()
                expect(result).toBe(false)
            })
        })

        describe('when user exists and is active', () => {
            it('returns true without destroying session', async () => {
                const user = createUserFixture()
                const req = createRequestMock()
                req.session.userId = user.id
                const ctx = createMockExecutionContext(req)
                userRepository.findById.mockResolvedValue(user)

                const result = await guard.canActivate(ctx)

                expect(req.session.destroy).not.toHaveBeenCalled()
                expect(result).toBe(true)
            })
        })
    })
})
