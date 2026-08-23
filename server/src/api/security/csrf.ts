import { csrfSync } from 'csrf-sync'
import type { Request } from 'express'

export const { generateToken, csrfSynchronisedProtection, revokeToken } = csrfSync({
    getTokenFromRequest: (req: Request) => {
        const token = req.headers['x-csrf-token']
        return Array.isArray(token) ? token[0] : token
    },
})
