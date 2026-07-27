import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InviteService } from '@/api/services/invite.service'
import { IInviteRepository } from '@/data/repositories/IInviteRepository'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { UserService } from '@/api/services/user.service'
import { MAX_INVITE_FAILED_ATTEMPTS } from '@/types/invite.constants'
import { InviteRevokedReason } from '@/types/models/invite'
import { createInviteRepositoryMock } from '../../mocks/invite.repository.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserServiceMock } from '../../mocks/user.service.mock'
import { createInviteFixture } from '../../fixtures/invite.stub'

describe('InviteService', () => {
    let service: InviteService
    let inviteRepositoryMock: ReturnType<typeof createInviteRepositoryMock>
    let loggerMock: ReturnType<typeof createLoggerMock>
    let userServiceMock: ReturnType<typeof createUserServiceMock>
    let cryptographyMock: jest.Mocked<Pick<CryptographyProvider, 'GenerateRandomToken' | 'HashSha256'>>

    beforeEach(async () => {
        inviteRepositoryMock = createInviteRepositoryMock()
        loggerMock = createLoggerMock()
        userServiceMock = createUserServiceMock()
        cryptographyMock = {
            GenerateRandomToken: jest.fn().mockReturnValue('raw-token'),
            HashSha256: jest.fn().mockReturnValue(Buffer.from('abcdef', 'hex')),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InviteService,
                { provide: IInviteRepository, useValue: inviteRepositoryMock },
                { provide: LoggingProvider, useValue: loggerMock },
                { provide: CryptographyProvider, useValue: cryptographyMock },
                { provide: UserService, useValue: userServiceMock },
            ],
        }).compile()

        service = module.get<InviteService>(InviteService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('createToken', () => {
        it('creates an unbound invite without checking for existing users', async () => {
            const invite = createInviteFixture()
            inviteRepositoryMock.create.mockResolvedValue(invite)

            const result = await service.createToken({ expiresInDays: 7 }, 'admin-id')

            expect(userServiceMock.getUserByEmail).not.toHaveBeenCalled()
            expect(inviteRepositoryMock.findActivePendingByEmail).not.toHaveBeenCalled()
            expect(inviteRepositoryMock.create).toHaveBeenCalled()
            expect(result.rawToken).toBe('raw-token')
            expect(result.invite.id).toBe(invite.id)
        })

        it('rejects with 409 when a user already exists for a bound invite email', async () => {
            userServiceMock.getUserByEmail.mockResolvedValue({ id: 'user-1' } as never)

            await expect(service.createToken({ email: 'a@b.com', expiresInDays: 7 }, 'admin-id')).rejects.toThrow(
                ConflictException
            )
            expect(inviteRepositoryMock.create).not.toHaveBeenCalled()
        })

        it('supersedes an existing active invite for the same email', async () => {
            const existing = createInviteFixture({ id: 'old-invite', email: 'a@b.com' })
            userServiceMock.getUserByEmail.mockResolvedValue(null)
            inviteRepositoryMock.findActivePendingByEmail.mockResolvedValue(existing)
            inviteRepositoryMock.create.mockResolvedValue(createInviteFixture({ email: 'a@b.com' }))

            await service.createToken({ email: 'a@b.com', expiresInDays: 7 }, 'admin-id')

            expect(inviteRepositoryMock.revoke).toHaveBeenCalledWith(
                'old-invite',
                InviteRevokedReason.AUTO_SUPERSEDED,
                null
            )
            expect(inviteRepositoryMock.create).toHaveBeenCalled()
        })

        it('does not supersede when no active invite exists for the email', async () => {
            userServiceMock.getUserByEmail.mockResolvedValue(null)
            inviteRepositoryMock.findActivePendingByEmail.mockResolvedValue(null)
            inviteRepositoryMock.create.mockResolvedValue(createInviteFixture({ email: 'a@b.com' }))

            await service.createToken({ email: 'a@b.com', expiresInDays: 7 }, 'admin-id')

            expect(inviteRepositoryMock.revoke).not.toHaveBeenCalled()
        })
    })

    describe('validateToken', () => {
        it('throws NotFound when the token does not exist', async () => {
            inviteRepositoryMock.findByToken.mockResolvedValue(null)

            await expect(service.validateToken('raw-token')).rejects.toThrow(NotFoundException)
        })

        it('throws when the invite is revoked', async () => {
            inviteRepositoryMock.findByToken.mockResolvedValue(createInviteFixture({ revokedAt: new Date() }))

            await expect(service.validateToken('raw-token')).rejects.toThrow(UnprocessableEntityException)
        })

        it('throws when the invite is already used', async () => {
            inviteRepositoryMock.findByToken.mockResolvedValue(createInviteFixture({ usedAt: new Date() }))

            await expect(service.validateToken('raw-token')).rejects.toThrow(ConflictException)
        })

        it('throws when the invite is expired', async () => {
            inviteRepositoryMock.findByToken.mockResolvedValue(
                createInviteFixture({ expiresAt: new Date(Date.now() - 1000) })
            )

            await expect(service.validateToken('raw-token')).rejects.toThrow(UnprocessableEntityException)
        })

        it('returns the invite for a valid unbound token', async () => {
            const invite = createInviteFixture()
            inviteRepositoryMock.findByToken.mockResolvedValue(invite)

            await expect(service.validateToken('raw-token')).resolves.toEqual(invite)
        })

        it('increments failed attempts and throws Forbidden on email mismatch for a bound invite', async () => {
            inviteRepositoryMock.findByToken.mockResolvedValue(createInviteFixture({ email: 'bound@b.com' }))
            inviteRepositoryMock.incrementFailedAttempts.mockResolvedValue(1)

            await expect(service.validateToken('raw-token', 'other@b.com')).rejects.toThrow(ForbiddenException)
            expect(inviteRepositoryMock.incrementFailedAttempts).toHaveBeenCalled()
            expect(inviteRepositoryMock.revoke).not.toHaveBeenCalled()
        })

        it('auto-revokes after reaching the failed-attempt threshold', async () => {
            const invite = createInviteFixture({ id: 'bound-invite', email: 'bound@b.com' })
            inviteRepositoryMock.findByToken.mockResolvedValue(invite)
            inviteRepositoryMock.incrementFailedAttempts.mockResolvedValue(MAX_INVITE_FAILED_ATTEMPTS)

            await expect(service.validateToken('raw-token', 'other@b.com')).rejects.toThrow(ForbiddenException)
            expect(inviteRepositoryMock.revoke).toHaveBeenCalledWith(
                'bound-invite',
                InviteRevokedReason.AUTO_FAILED_ATTEMPTS,
                null
            )
        })

        it('returns the invite when the bound email matches', async () => {
            const invite = createInviteFixture({ email: 'bound@b.com' })
            inviteRepositoryMock.findByToken.mockResolvedValue(invite)

            await expect(service.validateToken('raw-token', 'bound@b.com')).resolves.toEqual(invite)
            expect(inviteRepositoryMock.incrementFailedAttempts).not.toHaveBeenCalled()
        })
    })

    describe('revokeToken', () => {
        it('throws NotFound when the invite does not exist', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(null)

            await expect(service.revokeToken('id', 'admin-id')).rejects.toThrow(NotFoundException)
        })

        it('throws Conflict when the invite has already been used', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(createInviteFixture({ usedAt: new Date() }))

            await expect(service.revokeToken('id', 'admin-id')).rejects.toThrow(ConflictException)
            expect(inviteRepositoryMock.revoke).not.toHaveBeenCalled()
        })

        it('is a no-op when the invite is already revoked', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(createInviteFixture({ revokedAt: new Date() }))

            await service.revokeToken('id', 'admin-id')

            expect(inviteRepositoryMock.revoke).not.toHaveBeenCalled()
        })

        it('is a no-op when the invite is expired', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(
                createInviteFixture({ expiresAt: new Date(Date.now() - 1000) })
            )

            await service.revokeToken('id', 'admin-id')

            expect(inviteRepositoryMock.revoke).not.toHaveBeenCalled()
        })

        it('revokes a pending invite with the ADMIN reason and the acting admin id', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(createInviteFixture({ id: 'pending-invite' }))
            inviteRepositoryMock.revoke.mockResolvedValue(createInviteFixture())

            await service.revokeToken('pending-invite', 'admin-id')

            expect(inviteRepositoryMock.revoke).toHaveBeenCalledWith(
                'pending-invite',
                InviteRevokedReason.ADMIN,
                'admin-id'
            )
        })
    })

    describe('claimToken', () => {
        it('throws Conflict when the invite can no longer be claimed', async () => {
            inviteRepositoryMock.claim.mockResolvedValue(null)

            await expect(service.claimToken('invite-id', 'user-id')).rejects.toThrow(ConflictException)
        })

        it('returns the claimed invite on success', async () => {
            const claimed = createInviteFixture({ usedByUserId: 'user-id', usedAt: new Date() })
            inviteRepositoryMock.claim.mockResolvedValue(claimed)

            await expect(service.claimToken('invite-id', 'user-id')).resolves.toEqual(claimed)
            expect(inviteRepositoryMock.claim).toHaveBeenCalledWith('invite-id', 'user-id')
        })
    })
})
