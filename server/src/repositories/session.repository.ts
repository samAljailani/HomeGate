import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { Session } from '@prisma/generated'
import {
    SessionCreateRequestDto,
    SessionDeleteRequestDto,
    SessionFilterOptions,
    SessionLoadRequestDto,
} from '@/types/dtos/sessionDto'
import { ISessionRepository } from './ISessionRepository'

@Injectable()
export class SessionRepository implements ISessionRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
    }

    async get(request: SessionLoadRequestDto): Promise<Session | null> {
        return this.db.session.findUnique({
            where: { sid: request.sid },
        })
    }

    async getMany(filter: SessionFilterOptions): Promise<Session[]> {
        return this.db.session.findMany({
            where: { ...filter },
        })
    }

    async post(request: SessionCreateRequestDto): Promise<Session | null> {
        return this.db.session.create({
            data: request,
        })
    }

    async getByUserId(userId: string): Promise<Session[]> {
        return this.db.session.findMany({
            where: { userId },
        })
    }

    async put(sid: string, data: any, expiresAt: Date): Promise<Session | null> {
        return this.db.session.update({
            where: { sid },
            data: { data, expiresAt },
        })
    }

    async touch(sid: string, expiresAt: Date): Promise<Session | null> {
        return this.db.session.update({
            where: { sid: sid },
            data: { expiresAt: expiresAt },
        })
    }

    async delete(request: SessionDeleteRequestDto): Promise<void> {
        await this.db.session.deleteMany({
            where: { sid: request.sid },
        })
    }
}
