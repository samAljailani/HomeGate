import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import type { Session, SessionData } from 'express-session'

export function createRequestMock(overrides: Partial<ExpressRequest> = {}): jest.Mocked<ExpressRequest> {
    const session: Session & Partial<SessionData> = {
        userId: undefined,
        username: undefined,
        isAdmin: undefined,
        oauthTransaction: undefined,
        regenerate: jest.fn((cb) => cb(null)),
        save: jest.fn((cb) => cb(null)),
        destroy: jest.fn((cb) => cb()),
    } as unknown as Session & Partial<SessionData>

    return {
        user: undefined,
        session,
        ...overrides,
    } as unknown as jest.Mocked<ExpressRequest>
}

export function createResponseMock(overrides: Partial<ExpressResponse> = {}): jest.Mocked<ExpressResponse> {
    return {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        ...overrides,
    } as unknown as jest.Mocked<ExpressResponse>
}
