import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { ISessionRepository } from './ISessionRepository'
import type { SessionModel as PrismaSession } from '@prisma/generated/models'
import { CreateSessionModel, SessionModel, UpdateSessionModel, SessionFilterOptions } from '@/types/models/session'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'

@Injectable()
export class SessionRepository extends BaseRepository implements ISessionRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapSession(session: PrismaSession): SessionModel {
        return {
            id: session.id,
            userId: session.userId,
            sid: session.sid,
            data: session.data,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            device: session.device,
            browser: session.browser,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
        }
    }

    async delete(sid: string): Promise<void> {
        try {
            await this.db.session.deleteMany({ where: { sid } })
        } catch (error) {
            this.logger.error(`delete failed for sid: ${sid}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async touch(sid: string, expiresAt: Date): Promise<SessionModel | null> {
        try {
            // updateMany avoids P2025 when the session was concurrently evicted or expired.
            const result = await this.db.session.updateMany({ where: { sid }, data: { expiresAt } })
            if (result.count === 0) {
                return null
            }
            return this.findById(sid)
        } catch (error) {
            this.logger.error(`touch failed for sid: ${sid}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async findById(sid: string): Promise<SessionModel | null> {
        try {
            const session = await this.db.session.findUnique({ where: { sid } })
            return session ? this.mapSession(session) : null
        } catch (error) {
            this.logger.error(`findById failed for sid: ${sid}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async findByRecordId(id: string): Promise<SessionModel | null> {
        try {
            const session = await this.db.session.findUnique({ where: { id } })
            return session ? this.mapSession(session) : null
        } catch (error) {
            this.logger.error(`findByRecordId failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async findByUserId(userId: string): Promise<SessionModel[]> {
        try {
            const sessions = await this.db.session.findMany({ where: { userId } })
            return sessions.map((session) => this.mapSession(session))
        } catch (error) {
            this.logger.error(`findByUserId failed for userId: ${userId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async findMany(filter: SessionFilterOptions, take?: number, skip?: number): Promise<SessionModel[]> {
        try {
            const sessions = await this.db.session.findMany({
                where: { ...filter },
                orderBy: { createdAt: 'desc' },
                ...(take !== undefined ? { take } : {}),
                ...(skip !== undefined ? { skip } : {}),
            })
            return sessions.map((session) => this.mapSession(session))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async count(filter: SessionFilterOptions = {}): Promise<number> {
        try {
            return await this.db.session.count({ where: { ...filter } })
        } catch (error) {
            this.logger.error('count failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async create(request: CreateSessionModel): Promise<SessionModel | null> {
        try {
            const session = await this.db.session.create({ data: request })
            return this.mapSession(session)
        } catch (error) {
            this.logger.error('create failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async update(request: UpdateSessionModel): Promise<SessionModel | null> {
        try {
            const session = await this.db.session.update({
                where: { sid: request.sid },
                data: {
                    data: request.data,
                    expiresAt: request.expiresAt,
                    ipAddress: request.ipAddress,
                    userAgent: request.userAgent,
                    device: request.device,
                    browser: request.browser,
                },
            })
            return this.mapSession(session)
        } catch (error) {
            this.logger.error(`update failed for sid: ${request.sid}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async deleteByUserId(userId: string): Promise<void> {
        try {
            await this.db.session.deleteMany({ where: { userId } })
        } catch (error) {
            this.logger.error(`deleteByUserId failed for userId: ${userId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async deleteByProviderId(providerId: number): Promise<void> {
        try {
            await this.db.session.deleteMany({ where: { authProviderId: providerId } })
        } catch (error) {
            this.logger.error(`deleteByProviderId failed for providerId: ${providerId}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }

    async deleteExpired(cutoff: Date): Promise<number> {
        try {
            const result = await this.db.session.deleteMany({ where: { expiresAt: { lt: cutoff } } })
            return result.count
        } catch (error) {
            this.logger.error('deleteExpired failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.session)
        }
    }
}
