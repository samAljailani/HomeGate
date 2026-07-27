// Mock for @prisma/generated used by Jest.
// Provides a no-op PrismaClient class (so `extends PrismaClient` works at module-load time)
// and re-exports all enum values (which have no runtime dependencies).
export { OAuthProviderName, AuthSchemeName, LogLevel, InviteRevokedReason } from '../../prisma/generated/enums'

export class PrismaClient {
    $connect = jest.fn()
    $disconnect = jest.fn()
    $on = jest.fn()
}
