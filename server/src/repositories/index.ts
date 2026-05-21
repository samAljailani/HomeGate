import { ConfigRepository } from '@/repositories/config.repository'
import { UserRepository } from './user.repository'
import { UserOAuthIdentityRepository } from './userOAuthIdentity.repository'
import { OAuthProviderRepository } from './oauthProvider.repository'
import { AuthSchemeRepository } from './authScheme.repository'
import { ServiceRepository } from './service.repository'
import { UserAccountRepository } from './userAccount.repository'
import { SessionRepository } from './session.repository'
import { IUserRepository } from './IUserRepository'
import { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
import { IOAuthProviderRepository } from './IOAuthProviderRepository'
import { IAuthSchemeRepository } from './IAuthSchemeRepository'
import { IServiceRepository } from './IServiceRepository'
import { IUserAccountRepository } from './IUserAccountRepository'
import { ISessionRepository } from './ISessionRepository'

export { IUserRepository } from './IUserRepository'
export { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
export { IOAuthProviderRepository } from './IOAuthProviderRepository'
export { IAuthSchemeRepository } from './IAuthSchemeRepository'
export { IServiceRepository } from './IServiceRepository'
export { IUserAccountRepository } from './IUserAccountRepository'
export { ISessionRepository } from './ISessionRepository'

export const repositories = [
    ConfigRepository,
    { provide: IUserRepository,             useClass: UserRepository },
    { provide: IUserOAuthIdentityRepository, useClass: UserOAuthIdentityRepository },
    { provide: IOAuthProviderRepository,    useClass: OAuthProviderRepository },
    { provide: IAuthSchemeRepository,       useClass: AuthSchemeRepository },
    { provide: IServiceRepository,          useClass: ServiceRepository },
    { provide: IUserAccountRepository,      useClass: UserAccountRepository },
    { provide: ISessionRepository,          useClass: SessionRepository },
]