import { Injectable, Inject } from '@nestjs/common'
import session from 'express-session'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { parseUserAgent } from '@/lib/userAgent'

@Injectable()
export class PrismaSessionStore extends session.Store {
    private sessionExpiration(sessionData: session.SessionData): Date {
        const expiresAt = sessionData.cookie?.expires
            ? new Date(sessionData.cookie.expires)
            : new Date(Date.now() + (sessionData.cookie.originalMaxAge ?? sessionData.cookie.maxAge ?? 0))

        // Anonymous sessions are only needed temporarily for CSRF and the sign-in flow.
        return sessionData.userId && sessionData.username
            ? expiresAt
            : new Date(Math.min(expiresAt.getTime(), Date.now() + 15 * 60_000))
    }

    constructor(
        @Inject(ISessionRepository)
        private readonly sessionRepository: ISessionRepository,
        @Inject(CryptographyProvider)
        private readonly cryptographyProvider: CryptographyProvider
    ) {
        super()
    }

    async get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): Promise<void> {
        try {
            const hashedSid = this.cryptographyProvider.HashSha256(sid).toString('hex')
            const sessionRecord = await this.sessionRepository.findById(hashedSid)

            if (!sessionRecord || sessionRecord.expiresAt.getTime() <= Date.now()) {
                return callback(null, null)
            }

            const data = sessionRecord.data as unknown

            //minimally check whether the cookie data within the database is correct.
            if (!data || typeof data !== 'object' || !('cookie' in data)) {
                return callback(null, null)
            }

            callback(null, data as session.SessionData)
        } catch (error) {
            callback(error)
        }
    }

    async set(sid: string, sessionData: session.SessionData, callback?: (err?: unknown) => void): Promise<void> {
        try {
            const hashedSid = this.cryptographyProvider.HashSha256(sid).toString('hex')
            const expiresAt = this.sessionExpiration(sessionData)

            const existing = await this.sessionRepository.findById(hashedSid)

            const authenticated = sessionData.userId && sessionData.username
            const ipAddress = authenticated ? (sessionData as any).ipAddress ?? null : null
            const userAgent = authenticated ? (sessionData as any).userAgent ?? null : null
            const { device, browser } = parseUserAgent(userAgent)

            if (existing) {
                await this.sessionRepository.update({
                    sid: hashedSid,
                    data: sessionData,
                    expiresAt: expiresAt,
                    ipAddress,
                    userAgent,
                    device,
                    browser,
                })
            } else {
                await this.sessionRepository.create({
                    sid: hashedSid,
                    data: sessionData,
                    expiresAt,
                    userId: (sessionData as any).userId || undefined,
                    ipAddress,
                    userAgent,
                    device,
                    browser,
                })
            }

            callback?.()
        } catch (error) {
            callback?.(error)
        }
    }

    async destroy(sid: string, callback?: (err?: unknown) => void): Promise<void> {
        try {
            const hashedSid = this.cryptographyProvider.HashSha256(sid).toString('hex')
            await this.sessionRepository.delete(hashedSid)
            callback?.()
        } catch (error) {
            callback?.(error)
        }
    }

    override async touch(
        sid: string,
        sessionData: session.SessionData,
        callback?: (err?: unknown) => void
    ): Promise<void> {
        try {
            const hashedSid = this.cryptographyProvider.HashSha256(sid).toString('hex')

            const expiresAt = this.sessionExpiration(sessionData)

            await this.sessionRepository.touch(hashedSid, expiresAt)
            callback?.()
        } catch (error) {
            callback?.(error)
        }
    }
}
