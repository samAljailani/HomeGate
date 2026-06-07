import { OAuthUserProfileDto } from "@/types/dtos/authDto";

export function createOAuthUserProfileFixture(overrides: Partial<OAuthUserProfileDto> = {}) : OAuthUserProfileDto {
    return {
        providerAccountId : '111',
        email: 'testUser@gmail.com',
        accessToken: 'abcdefg',
        refreshToken: 'abcdefghs',
        provider: 'google',
        ...overrides
    }
}