import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { GoogleOAuthGuard } from '@/middleware/google-oauth.guard'
import { createOAuthUserProfileFixture } from '../../fixtures/auth.stub'

describe('GoogleOAuthGuard', () => {
    let guard: GoogleOAuthGuard

    beforeEach(() => {
        guard = new GoogleOAuthGuard()
    })

    describe('handleRequest', () => {
        const ctx = {} as ExecutionContext

        describe('when Passport returns an error', () => {
            it('throws the error', () => {
                const error = new Error('OAuth failed')

                expect(() => guard.handleRequest(error, false, null, ctx)).toThrow(error)
            })
        })

        describe('when Passport returns no user', () => {
            it('throws UnauthorizedException', () => {
                expect(() => guard.handleRequest(null, false, null, ctx)).toThrow(UnauthorizedException)
            })
        })

        describe('when user profile is invalid', () => {
            it('throws UnauthorizedException', () => {
                const invalidProfile = { providerAccountId: '', email: '' }

                expect(() => guard.handleRequest(null, invalidProfile, null, ctx)).toThrow(UnauthorizedException)
            })
        })

        describe('when user profile is valid', () => {
            it('returns a validated OAuthUserProfileDto instance', () => {
                const profile = createOAuthUserProfileFixture()

                const result = guard.handleRequest(null, profile, null, ctx)

                expect(result).toMatchObject(profile)
            })
        })
    })
})
