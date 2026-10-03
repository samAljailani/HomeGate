import type { Request, Response } from 'express'
import type { SessionData } from 'express-session'
import { SessionClientInfoMiddleware } from '@/api/middleware/sessionClientInfo.middleware'
import { SessionService } from '@/api/services/session.service'
import { SessionController } from '@/api/controllers/session.controller'
import { PrismaSessionStore } from '@/infrastructure/prismaSession.store'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { SessionRepository } from '@/data/repositories/session.repository'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { IUserRepository } from '@/data/repositories/IUserRepository'
import { IOAuthProviderRepository } from '@/data/repositories/IOAuthProviderRepository'
import { ISystemMetadataRepository } from '@/data/repositories/ISystemMetadataRepository'
import { createLoggerMock } from '../../mocks/logger.provider.mock'

jest.mock('express-session', () => ({
    __esModule: true,
    default: jest.requireActual('express-session'),
}))

function loggerMock(): LoggingProvider {
    return createLoggerMock() as unknown as LoggingProvider
}

describe('Session monitoring', () => {
    it('does not initialize a session just to record an anonymous visitor', () => {
        const req = {
            session: {},
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test' },
        } as unknown as Request
        const next = jest.fn()
        new SessionClientInfoMiddleware().use(req, {} as Response, next)
        expect(req.session).toEqual({})
        expect(next).toHaveBeenCalled()
    })

    it('records client information for a signed-in user', () => {
        const req = {
            session: { userId: 'user-1', username: 'testuser' },
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test' },
        } as unknown as Request
        new SessionClientInfoMiddleware().use(req, {} as Response, jest.fn())
        expect(req.session).toMatchObject({
            ipAddress: '127.0.0.1',
            userAgent: 'test',
        })
    })

    it('lists all stored sessions and uses the same filter for the total', async () => {
        const db = {
            session: {
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
            },
        }
        const repository = new SessionRepository(
            db as unknown as PrismaProvider,
            loggerMock()
        )
        const service = new SessionService(
            repository,
            {} as IUserRepository,
            {} as IOAuthProviderRepository,
            {} as ISystemMetadataRepository,
            loggerMock()
        )
        const result = await service.list(20, 40)
        const where = {}
        expect(db.session.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where, take: 20, skip: 40 })
        )
        expect(db.session.count).toHaveBeenCalledWith({ where })
        expect(result.total).toBe(0)
    })

    it('revokes every session in one transaction while preserving audit logs', async () => {
        const tx = {
            log: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
            session: {
                deleteMany: jest.fn().mockResolvedValue({ count: 13_000 }),
            },
        }
        const db = { $transaction: jest.fn(async (work) => work(tx)) }
        const repository = new SessionRepository(
            db as unknown as PrismaProvider,
            loggerMock()
        )
        const service = new SessionService(
            repository,
            {} as IUserRepository,
            {} as IOAuthProviderRepository,
            {} as ISystemMetadataRepository,
            loggerMock()
        )
        await service.revokeAll()
        expect(tx.log.updateMany).toHaveBeenCalledWith({
            where: { sessionId: { not: null } },
            data: { sessionId: null },
        })
        expect(tx.session.deleteMany).toHaveBeenCalledWith({})
        expect(tx.log.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
            tx.session.deleteMany.mock.invocationCallOrder[0]!
        )
    })

    it('destroys the current request session after bulk revocation so it cannot be saved again', async () => {
        const service = { revokeAll: jest.fn().mockResolvedValue(undefined) }
        const destroy = jest.fn((callback) => callback())
        const req = { session: { destroy } } as unknown as Request
        const controller = new SessionController(
            service as unknown as SessionService
        )
        await controller.revokeAll(req)
        expect(service.revokeAll).toHaveBeenCalled()
        expect(destroy).toHaveBeenCalled()
    })
})

describe('Temporary sign-in sessions', () => {
    const now = new Date('2026-10-03T12:00:00Z')
    beforeEach(() => jest.useFakeTimers().setSystemTime(now))
    afterEach(() => jest.useRealTimers())

    function setup() {
        const repository = {
            findById: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
            touch: jest.fn(),
        }
        const crypto = {
            HashSha256: jest.fn().mockReturnValue(Buffer.from('hash')),
        }
        const store = new PrismaSessionStore(
            repository as unknown as ISessionRepository,
            crypto as unknown as CryptographyProvider
        )
        return { repository, store }
    }

    it('preserves CSRF and OAuth state but limits anonymous sessions to 15 minutes', async () => {
        const { repository, store } = setup()
        const data = {
            cookie: { expires: new Date(now.getTime() + 86_400_000) },
            csrfToken: 'token',
            oauthTransaction: {
                inviteToken: 'invite',
                inviteId: 'id',
                expiresAt: new Date(now.getTime() + 60_000),
            },
        } as SessionData
        const callback = jest.fn()
        await store.set('sid', data, callback)
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data,
                expiresAt: new Date(now.getTime() + 15 * 60_000),
                ipAddress: null,
                userAgent: null,
            })
        )
        expect(callback).toHaveBeenCalledWith()
        await store.touch('sid', data)
        expect(repository.touch).toHaveBeenCalledWith(
            expect.any(String),
            new Date(now.getTime() + 15 * 60_000)
        )
    })

    it('keeps the configured lifetime for signed-in sessions', async () => {
        const { repository, store } = setup()
        const expires = new Date(now.getTime() + 86_400_000)
        await store.set('sid', {
            cookie: { expires },
            userId: 'user-1',
            username: 'testuser',
        } as SessionData)
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({ expiresAt: expires, userId: 'user-1' })
        )
    })

    it('does not restore an expired session before the purge job runs', async () => {
        const { repository, store } = setup()
        repository.findById.mockResolvedValue({
            expiresAt: new Date(now.getTime() - 1),
            data: { cookie: {} },
        })
        const callback = jest.fn()
        await store.get('sid', callback)
        expect(callback).toHaveBeenCalledWith(null, null)
    })
})
