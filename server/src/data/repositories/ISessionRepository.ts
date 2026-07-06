import { CreateSessionModel, SessionModel, UpdateSessionModel, SessionFilterOptions } from '@/types/models/session'

export const ISessionRepository = Symbol('ISessionRepository')

export interface ISessionRepository {
    findById(sid: string): Promise<SessionModel | null>
    findByUserId(userId: string): Promise<SessionModel[]>
    findMany(filter: SessionFilterOptions): Promise<SessionModel[]>
    create(request: CreateSessionModel): Promise<SessionModel | null>
    update(request: UpdateSessionModel): Promise<SessionModel | null>
    delete(sid: string): Promise<void>
    deleteByUserId(userId: string): Promise<void>
    deleteByProviderId(providerId: number): Promise<void>
    touch(sid: string, expiresAt: Date): Promise<SessionModel | null>
}
