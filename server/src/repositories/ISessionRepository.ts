import { CreateSessionModel, SessionModel, UpdateSessionModel } from '@/types/models/session'
import { SessionFilterOptions } from '@/types/dtos/sessionDto'

export const ISessionRepository = Symbol('ISessionRepository')

export interface ISessionRepository {
    findById(sid: string): Promise<SessionModel | null>
    findByUserId(userId: string): Promise<SessionModel[]>
    findMany(filter: SessionFilterOptions): Promise<SessionModel[]>
    create(request: CreateSessionModel): Promise<SessionModel | null>
    update(request: UpdateSessionModel): Promise<SessionModel | null>
    delete(sid: string): Promise<void>
    touch(sid: string, expiresAt: Date): Promise<SessionModel | null>
}
