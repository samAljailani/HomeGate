import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { InviteService } from '@/api/services/invite.service'
import { IInviteRepository } from '@/data/repositories/IInviteRepository'
import { IServiceRepository } from '@/data/repositories/IServiceRepository'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { UserService } from '@/api/services/user.service'
import { MAX_INVITE_FAILED_ATTEMPTS } from '@/types/invite.constants'
import { InviteRevokedReason } from '@/types/models/invite'
import { createInviteRepositoryMock } from '../../mocks/invite.repository.mock'
import { createServiceRepositoryMock } from '../../mocks/service.repository.mock'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserServiceMock } from '../../mocks/user.service.mock'
import { createInviteFixture } from '../../fixtures/invite.stub'

describe('InviteService', () => {
    let service: InviteService
    let inviteRepositoryMock: ReturnType<typeof createInviteRepositoryMock>
    let serviceRepositoryMock: ReturnType<typeof createServiceRepositoryMock>
    let loggerMock: ReturnType<typeof createLoggerMock>
    let userServiceMock: ReturnType<typeof createUserServiceMock>
    let cryptographyMock: jest.Mocked<Pick<CryptographyProvider, 'GenerateRandomToken' | 'HashSha256'>>

    beforeEach(async () => {
        inviteRepositoryMock = createInviteRepositoryMock()
        serviceRepositoryMock = createServiceRepositoryMock()
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
                { provide: IServiceRepository, useValue: serviceRepositoryMock },
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

    describe('deleteInvite', () => {
        it('throws NotFound when the invite does not exist', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(null)

            await expect(service.deleteInvite('id')).rejects.toThrow(NotFoundException)
            expect(inviteRepositoryMock.delete).not.toHaveBeenCalled()
        })

        it('deletes a pending invite', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(createInviteFixture({ id: 'inv-1' }))

            await service.deleteInvite('inv-1')

            expect(inviteRepositoryMock.delete).toHaveBeenCalledWith('inv-1')
        })

        it('deletes a revoked invite', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(
                createInviteFixture({ id: 'inv-2', revokedAt: new Date() })
            )

            await service.deleteInvite('inv-2')

            expect(inviteRepositoryMock.delete).toHaveBeenCalledWith('inv-2')
        })

        it('deletes a used invite', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(
                createInviteFixture({ id: 'inv-3', usedAt: new Date() })
            )

            await service.deleteInvite('inv-3')

            expect(inviteRepositoryMock.delete).toHaveBeenCalledWith('inv-3')
        })
    })

    describe('updateInvite', () => {
        it('throws NotFound when the invite does not exist', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(null)

            await expect(service.updateInvite('id', { email: 'x@y.com' }, 'admin')).rejects.toThrow(NotFoundException)
        })

        it('throws Unprocessable when the invite has been used', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(createInviteFixture({ usedAt: new Date() }))

            await expect(service.updateInvite('id', { email: 'x@y.com' }, 'admin')).rejects.toThrow(
                UnprocessableEntityException
            )
        })

        it('throws Unprocessable when the invite is revoked', async () => {
            inviteRepositoryMock.findById.mockResolvedValue(createInviteFixture({ revokedAt: new Date() }))

            await expect(service.updateInvite('id', { email: 'x@y.com' }, 'admin')).rejects.toThrow(
                UnprocessableEntityException
            )
        })

        it('applies field updates and revoke in a single update call', async () => {
            const invite = createInviteFixture({ id: 'inv-1' })
            const revoked = createInviteFixture({ id: 'inv-1', email: 'new@e.com', revokedAt: new Date() })
            inviteRepositoryMock.findById.mockResolvedValue(invite)
            inviteRepositoryMock.update.mockResolvedValue(revoked)

            await service.updateInvite('inv-1', { revoked: true, email: 'new@e.com' }, 'admin-id')

            expect(inviteRepositoryMock.update).toHaveBeenCalledWith('inv-1', expect.objectContaining({
                email: 'new@e.com',
                revokedAt: expect.any(Date),
                revokedReason: InviteRevokedReason.ADMIN,
                revokedByUserId: 'admin-id',
            }))
            expect(inviteRepositoryMock.revoke).not.toHaveBeenCalled()
        })

        it('returns the unchanged invite when no fields are provided', async () => {
            const invite = createInviteFixture()
            inviteRepositoryMock.findById.mockResolvedValue(invite)

            const result = await service.updateInvite('id', {}, 'admin')

            expect(inviteRepositoryMock.update).not.toHaveBeenCalled()
            expect(result.id).toBe(invite.id)
        })

        it('updates specified fields', async () => {
            const invite = createInviteFixture({ id: 'inv-1' })
            const updated = createInviteFixture({ id: 'inv-1', email: 'new@email.com' })
            inviteRepositoryMock.findById.mockResolvedValue(invite)
            inviteRepositoryMock.update.mockResolvedValue(updated)

            const result = await service.updateInvite('inv-1', { email: 'new@email.com' }, 'admin')

            expect(inviteRepositoryMock.update).toHaveBeenCalledWith('inv-1', { email: 'new@email.com' })
            expect(result.email).toBe('new@email.com')
        })
    })

    describe('createToken with accounts', () => {
        it('throws BadRequest when account email is provided without invite email', async () => {
            await expect(
                service.createToken(
                    { expiresInDays: 7, accounts: [{ serviceName: 'jellyfin', email: 'a@b.com' }] },
                    'admin-id'
                )
            ).rejects.toThrow(BadRequestException)
        })

        it('throws BadRequest when account email does not match invite email', async () => {
            await expect(
                service.createToken(
                    { expiresInDays: 7, email: 'x@y.com', accounts: [{ serviceName: 'jellyfin', email: 'a@b.com' }] },
                    'admin-id'
                )
            ).rejects.toThrow(BadRequestException)
        })

        it('throws BadRequest for an invalid service name', async () => {
            await expect(
                service.createToken(
                    { expiresInDays: 7, accounts: [{ serviceName: 'invalid-service', username: 'user1' }] },
                    'admin-id'
                )
            ).rejects.toThrow(BadRequestException)
        })

        it('throws BadRequest when service does not exist in the database', async () => {
            serviceRepositoryMock.findByName.mockResolvedValue(null)

            await expect(
                service.createToken(
                    { expiresInDays: 7, accounts: [{ serviceName: 'jellyfin', username: 'user1' }] },
                    'admin-id'
                )
            ).rejects.toThrow(BadRequestException)
        })

        it('creates an invite with resolved account service IDs', async () => {
            serviceRepositoryMock.findByName.mockResolvedValue({ id: 5, name: 'jellyfin' } as never)
            userServiceMock.getUserByEmail.mockResolvedValue(null)
            inviteRepositoryMock.findActivePendingByEmail.mockResolvedValue(null)
            const invite = createInviteFixture({ email: 'a@b.com' })
            inviteRepositoryMock.create.mockResolvedValue(invite)

            await service.createToken(
                { expiresInDays: 7, email: 'a@b.com', accounts: [{ serviceName: 'jellyfin', email: 'a@b.com', username: 'user1' }] },
                'admin-id'
            )

            expect(inviteRepositoryMock.create).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'a@b.com' }),
                [{ serviceId: 5, email: 'a@b.com', username: 'user1' }]
            )
        })
    })

    describe('listInvites', () => {
        it('returns mapped invites', async () => {
            const invites = [createInviteFixture({ id: 'a' }), createInviteFixture({ id: 'b' })]
            inviteRepositoryMock.findAll.mockResolvedValue(invites)

            const result = await service.listInvites(10, 0)

            expect(inviteRepositoryMock.findAll).toHaveBeenCalledWith(10, 0)
            expect(result).toHaveLength(2)
            expect(result[0].id).toBe('a')
            expect(result[1].id).toBe('b')
        })
    })
})
