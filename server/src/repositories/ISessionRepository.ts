import { Session } from '@prisma/generated';
import { SessionCreateRequestDto, SessionDeleteRequestDto, SessionFilterOptions, SessionLoadRequestDto } from '@/types/dtos/sessionDto';

export const ISessionRepository = Symbol('ISessionRepository');

export interface ISessionRepository {
    get(request: SessionLoadRequestDto): Promise<Session | null>;
    getByUserId(user_id: string): Promise<Session[]>;
    getMany(filter: SessionFilterOptions): Promise<Session[]>;
    post(request: SessionCreateRequestDto): Promise<Session | null>;
    delete(request: SessionDeleteRequestDto): Promise<void>;
}
