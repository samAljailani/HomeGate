import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { SessionFilterOptions } from '@/types/dtos/sessionDto'
import { ISessionRepository } from './ISessionRepository'
import type { SessionModel as PrismaSession } from '@prisma/generated/models'
import { CreateSessionModel, SessionModel, UpdateSessionModel } from '@/types/models/session'

@Injectable()
export class SessionRepository implements ISessionRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
    }

    private mapSession(session: PrismaSession): SessionModel {
        return {
            id: session.id,
            userId: session.userId,
            sid: session.sid,
            data: session.data,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
        }
    }

    async delete(sid: string): Promise<void> {
        await this.db.session.deleteMany({
            where: { sid },
        })
    }

    async touch(sid: string, expiresAt: Date): Promise<SessionModel | null> {
        const session = await this.db.session.update({
            where: { sid },
            data: { expiresAt },
        })

        return this.mapSession(session)
    }

    async findById(sid: string): Promise<SessionModel | null> {
        const session = await this.db.session.findUnique({
            where: { sid: sid },
        })

        return session ? this.mapSession(session) : null
    }

    async findByUserId(userId: string): Promise<SessionModel[]> {
        const sessions = await this.db.session.findMany({
            where: { userId },
        })

        return sessions.map((session) => this.mapSession(session))
    }

    async findMany(filter: SessionFilterOptions): Promise<SessionModel[]> {
        const sessions = await this.db.session.findMany({
            where: { ...filter },
        })

        return sessions.map((session) => this.mapSession(session))
    }

    async create(request: CreateSessionModel): Promise<SessionModel | null> {
        const session = await this.db.session.create({
            data: request,
        })

        return this.mapSession(session)
    }

    async update(request: UpdateSessionModel): Promise<SessionModel | null> {
        const session = await this.db.session.update({
            where: { sid: request.sid },
            data: {
                data: request.data,
                expiresAt: request.expiresAt,
            },
        })

        return this.mapSession(session)
    }

}
