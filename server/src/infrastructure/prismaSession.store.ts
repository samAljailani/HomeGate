import { Injectable, Inject } from '@nestjs/common'
import session from 'express-session'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { parseUserAgent } from '@/lib/userAgent'

@Injectable()
export class PrismaSessionStore extends session.Store {
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

            if (!sessionRecord) {
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
            const expiresAt = sessionData.cookie?.expires
                ? new Date(sessionData.cookie.expires)
                : new Date(Date.now() + (sessionData.cookie.maxAge || 0))

            const existing = await this.sessionRepository.findById(hashedSid)

            const ipAddress = (sessionData as any).ipAddress ?? null
            const userAgent = (sessionData as any).userAgent ?? null
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

            const expiresAt = sessionData.cookie?.expires
                ? new Date(sessionData.cookie.expires)
                : new Date(Date.now() + (sessionData.cookie.originalMaxAge ?? 0))

            await this.sessionRepository.touch(hashedSid, expiresAt)
            callback?.()
        } catch (error) {
            callback?.(error)
        }
    }
}
