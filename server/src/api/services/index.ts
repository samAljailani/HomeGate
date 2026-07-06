import { AuthService } from './auth.service'
import { InviteService } from './invite.service'
import { LogService } from './log.service'
import { OAuthProviderManagementService } from './oauthProviderManagement.service'
import { ServiceManagementService } from './serviceManagement.service'
import { SubscriptionService } from './subscriptions.service'
import { UserService } from './user.service'

export const services = [
    UserService,
    AuthService,
    SubscriptionService,
    InviteService,
    ServiceManagementService,
    OAuthProviderManagementService,
    LogService,
]
