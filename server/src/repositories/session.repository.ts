import { Injectable, Inject } from '@nestjs/common';
import { PrismaProvider } from '@/providers/prisma.provider';
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
            where: { token: request.hashed_token },
        });
    }

    async getMany(filter: SessionFilterOptions): Promise<Session[]> {
        return this.db.session.findMany({
            where: { ...filter },
        });
    }

    async post(request: SessionCreateRequestDto): Promise<Session | null> {
        const { hashed_token, ...rest } = request;
        return this.db.session.create({
            data: { ...rest, token: hashed_token },
        });
    }

    async getByUserId(user_id: string): Promise<Session[]> {
        return this.db.session.findMany({
            where: { user_id },
        });
    }

    async delete(request: SessionDeleteRequestDto): Promise<void> {
        await this.db.session.delete({
            where: { id: request.id },
        });
    }
}
