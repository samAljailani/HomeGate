import { OAuthIdentityResponseDto } from '@/types/dtos/userOAuthIdentityDto'

export function createOAuthIdentityFixture(
    overrides: Partial<OAuthIdentityResponseDto> = {}
): OAuthIdentityResponseDto {
    const dto = new OAuthIdentityResponseDto()
    Object.assign(dto, {
        id: 'identity-uuid-1',
        userId: 'xxx',
        providerId: 1,
        profileId: 'google-profile-123',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    })
    return dto
}
