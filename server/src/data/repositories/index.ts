import { EnvRepository } from '@/data/repositories/env.repository'

import { IAuthSchemeRepository } from './IAuthSchemeRepository'
import { IInviteRepository } from './IInviteRepository'
import { IOAuthProviderRepository } from './IOAuthProviderRepository'
import { IServiceRepository } from './IServiceRepository'
import { ISessionRepository } from './ISessionRepository'
import { ISubscriptionRepository } from './ISubscriptionRepository'
import { IExternalUserAccountRepository } from './IExternalUserAccountRepository'
import { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
import { IUserRepository } from './IUserRepository'
import { AuthSchemeRepository } from './authScheme.repository'
import { InviteRepository } from './invite.repository'
import { OAuthProviderRepository } from './oauthProvider.repository'
import { ServiceRepository } from './service.repository'
import { SessionRepository } from './session.repository'
import { UserRepository } from './user.repository'
import { SubscriptionRepository } from './subscription.repository'
import { ExternalUserAccountRepository } from './externalUserAccount.repository'
import { UserOAuthIdentityRepository } from './userOAuthIdentity.repository'
import { ILoggingRepository } from './ILoggingRepository'
import { LoggingRepository } from './logging.repository'
import { ISystemMetadataRepository } from './ISystemMetadataRepository'
import { SystemMetadataRepository } from './systemMetadata.repository'
import { ITaskRunRepository } from './ITaskRunRepository'
import { TaskRunRepository } from './taskRun.repository'
import { IUserServicePolicyRepository } from './IUserServicePolicyRepository'
import { UserServicePolicyRepository } from './userServicePolicy.repository'

export { IUserRepository } from './IUserRepository'
export { IUserOAuthIdentityRepository } from './IUserOAuthIdentityRepository'
export { IOAuthProviderRepository } from './IOAuthProviderRepository'
export { IAuthSchemeRepository } from './IAuthSchemeRepository'
export { IInviteRepository } from './IInviteRepository'
export { IServiceRepository } from './IServiceRepository'
export { ISubscriptionRepository } from './ISubscriptionRepository'
export { IExternalUserAccountRepository } from './IExternalUserAccountRepository'
export { ISessionRepository } from './ISessionRepository'
export { ISystemMetadataRepository } from './ISystemMetadataRepository'
export { ITaskRunRepository } from './ITaskRunRepository'
export { IUserServicePolicyRepository } from './IUserServicePolicyRepository'

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
    { provide: ISubscriptionRepository, useClass: SubscriptionRepository },
    { provide: IExternalUserAccountRepository, useClass: ExternalUserAccountRepository },
    { provide: ISessionRepository, useClass: SessionRepository },
    { provide: IInviteRepository, useClass: InviteRepository },
    { provide: ISystemMetadataRepository, useClass: SystemMetadataRepository },
    { provide: ITaskRunRepository, useClass: TaskRunRepository },
    { provide: IUserServicePolicyRepository, useClass: UserServicePolicyRepository },
]
