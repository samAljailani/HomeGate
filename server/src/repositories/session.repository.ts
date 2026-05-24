import { Injectable, Inject } from '@nestjs/common';
import { PrismaProvider } from '@/infrastructure/prisma.provider';
import { Session } from '@prisma/generated';
import { SessionCreateRequestDto, SessionDeleteRequestDto, SessionFilterOptions, SessionLoadRequestDto } from '@/types/dtos/sessionDto';
import { ISessionRepository } from './ISessionRepository';

@Injectable()
export class SessionRepository implements ISessionRepository {
    private db: PrismaProvider;
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db;
    }

    async get(request: SessionLoadRequestDto): Promise<Session | null> {
        return this.db.session.findUnique({
            where: { sid: request.sid },
        });
    }

    async getMany(filter: SessionFilterOptions): Promise<Session[]> {
        return this.db.session.findMany({
            where: { ...filter },
        });
    }

    async post(request: SessionCreateRequestDto): Promise<Session | null> {
        return this.db.session.create({
            data: request,
        });
    }

    async getByUserId(user_id: string): Promise<Session[]> {
        return this.db.session.findMany({
            where: { user_id },
        });
    }

    async put(sid: string, data: any, expires_at: Date): Promise<Session | null> {
        return this.db.session.update({
            where: { sid },
            data: { data, expires_at },
        });
    }

    async touch(sid: string, expires_at: Date): Promise<Session | null> {
        return this.db.session.update({
            where: { sid: sid },
            data: { expires_at: expires_at },
        });
    }

    async delete(request: SessionDeleteRequestDto): Promise<void> {
        await this.db.session.deleteMany({
            where: { sid: request.sid },
        });
    }
}
