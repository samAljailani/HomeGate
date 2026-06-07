import { ConfigRepository } from '@/data/repositories/config.repository'

import { IAuthSchemeRepository } from './IAuthSchemeRepository'
import { IOAuthProviderRepository } from './IOAuthProviderRepository'
import { IServiceRepository } from './IServiceRepository'
import { ISessionRepository } from './ISessionRepository'
import { IUserAccountRepository } from './IUserAccountRepository'
import { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
import { IUserRepository } from './IUserRepository'
import { AuthSchemeRepository } from './authScheme.repository'
import { OAuthProviderRepository } from './oauthProvider.repository'
import { ServiceRepository } from './service.repository'
import { SessionRepository } from './session.repository'
import { UserRepository } from './user.repository'
import { UserAccountRepository } from './userAccount.repository'
import { UserOAuthIdentityRepository } from './userOAuthIdentity.repository'
import { ILoggingRepository } from './ILoggingRepository'
import { LoggingRepository } from './logging.repository'

export { IUserRepository } from './IUserRepository'
export { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
export { IOAuthProviderRepository } from './IOAuthProviderRepository'
export { IAuthSchemeRepository } from './IAuthSchemeRepository'
export { IServiceRepository } from './IServiceRepository'
export { IUserAccountRepository } from './IUserAccountRepository'
export { ISessionRepository } from './ISessionRepository'

export const repositories = [
    ConfigRepository,
    { provide: ILoggingRepository, useClass: LoggingRepository },
    { provide: IUserRepository, useClass: UserRepository },
    {
        provide: IUserOAuthIdentityRepository,
        useClass: UserOAuthIdentityRepository,
    },
    { provide: IOAuthProviderRepository, useClass: OAuthProviderRepository },
    { provide: IAuthSchemeRepository, useClass: AuthSchemeRepository },
    { provide: IServiceRepository, useClass: ServiceRepository },
    { provide: IUserAccountRepository, useClass: UserAccountRepository },
    { provide: ISessionRepository, useClass: SessionRepository },
]
