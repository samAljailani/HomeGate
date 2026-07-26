import { EnvRepository } from '@/data/repositories/env.repository'

import { IAuthSchemeRepository } from './IAuthSchemeRepository'
import { IInviteRepository } from './IInviteRepository'
import { IOAuthProviderRepository } from './IOAuthProviderRepository'
import { IServiceRepository } from './IServiceRepository'
import { ISessionRepository } from './ISessionRepository'
import { IUserAccountRepository } from './IUserAccountRepository'
import { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
import { IUserRepository } from './IUserRepository'
import { AuthSchemeRepository } from './authScheme.repository'
import { InviteRepository } from './invite.repository'
import { OAuthProviderRepository } from './oauthProvider.repository'
import { ServiceRepository } from './service.repository'
import { SessionRepository } from './session.repository'
import { UserRepository } from './user.repository'
import { UserAccountRepository } from './userAccount.repository'
import { UserOAuthIdentityRepository } from './userOAuthIdentity.repository'
import { ILoggingRepository } from './ILoggingRepository'
import { LoggingRepository } from './logging.repository'
import { ISystemMetadataRepository } from './ISystemMetadataRepository'
import { SystemMetadataRepository } from './systemMetadata.repository'

export { IUserRepository } from './IUserRepository'
export { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
export { IOAuthProviderRepository } from './IOAuthProviderRepository'
export { IAuthSchemeRepository } from './IAuthSchemeRepository'
export { IInviteRepository } from './IInviteRepository'
export { IServiceRepository } from './IServiceRepository'
export { IUserAccountRepository } from './IUserAccountRepository'
export { ISessionRepository } from './ISessionRepository'
export { ISystemMetadataRepository } from './ISystemMetadataRepository'

export const repositories = [
    EnvRepository,
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
    { provide: IInviteRepository, useClass: InviteRepository },
    { provide: ISystemMetadataRepository, useClass: SystemMetadataRepository },
]
