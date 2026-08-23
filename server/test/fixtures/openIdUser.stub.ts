import { OAuthUserProfileDto } from '@/types/dtos/authDto'

export function createOpenIDUserFixture(overrides: Partial<OAuthUserProfileDto> = {}): OAuthUserProfileDto {
    const dto = new OAuthUserProfileDto()
    Object.assign(dto, {
        providerAccountId: 'google-profile-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        provider: 'google',
        accessToken: 'access-token-stub',
        refreshToken: 'refresh-token-stub',
        ...overrides,
    })
    return dto
}
