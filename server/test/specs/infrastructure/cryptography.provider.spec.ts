import { CryptographyProvider } from '@/infrastructure/cryptography.provider'

describe('CryptographyProvider', () => {
    let provider: CryptographyProvider

    beforeEach(() => {
        provider = new CryptographyProvider()
    })

    describe('RandomUUID', () => {
        it('returns a valid UUID v4', () => {
            const uuid = provider.RandomUUID()

            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
        })

        it('returns a different value on each call', () => {
            expect(provider.RandomUUID()).not.toBe(provider.RandomUUID())
        })
    })

    describe('HashSha256', () => {
        it('returns a Buffer', () => {
            const result = provider.HashSha256('hello')

            expect(Buffer.isBuffer(result)).toBe(true)
        })

        it('returns the same hash for the same input', () => {
            const a = provider.HashSha256('hello').toString('hex')
            const b = provider.HashSha256('hello').toString('hex')

            expect(a).toBe(b)
        })

        it('returns different hashes for different inputs', () => {
            const a = provider.HashSha256('hello').toString('hex')
            const b = provider.HashSha256('world').toString('hex')

            expect(a).not.toBe(b)
        })
    })
})
