import 'express-session'

export type OAuthTransaction = {
    inviteToken: string
    inviteId: string
    expiresAt: Date
}

declare module 'express-session' {
    interface SessionData {
        userId?: string
        username?: string
        isAdmin?: boolean
        csrfToken?: string
        oauthTransaction?: OAuthTransaction
    }
}
