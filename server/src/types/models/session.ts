export type SessionModel = {
    id: string
    userId: string | null
    sid: string
    data: any
    ipAddress: string | null
    userAgent: string | null
    device: string | null
    browser: string | null
    expiresAt: Date
    createdAt: Date
}

export type CreateSessionModel = Omit<SessionModel, 'id' | 'createdAt' | 'ipAddress' | 'userAgent' | 'device' | 'browser'> & {
    ipAddress?: string | null
    userAgent?: string | null
    device?: string | null
    browser?: string | null
}

export type UpdateSessionModel = Omit<SessionModel, 'id' | 'createdAt' | 'userId'>

export class SessionFilterOptions {
    userId?: string
    sid?: string
}
