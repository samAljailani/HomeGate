export type SessionModel = {
    id: string
    userId: string | null
    sid: string
    data: any
    expiresAt: Date
    createdAt: Date
}

export type CreateSessionModel = Omit<SessionModel, 'id' | 'createdAt'>

export type UpdateSessionModel = Omit<SessionModel, 'id' | 'createdAt' | 'userId'>
