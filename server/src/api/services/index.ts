import { AuthService } from './auth.service'
import { ConfigService } from './config.service'
import { InviteService } from './invite.service'
import { LogService } from './log.service'
import { OAuthProviderManagementService } from './oauthProviderManagement.service'
import { SchedulerService } from './scheduler.service'
import { ServiceManagementService } from './serviceManagement.service'
import { SubscriptionService } from './subscriptions.service'
import { TaskService } from './tasks.service'
import { UserService } from './user.service'

export const services = [
    ConfigService,
    UserService,
    AuthService,
    SubscriptionService,
    InviteService,
    ServiceManagementService,
    OAuthProviderManagementService,
    LogService,
    TaskService,
    SchedulerService,
]
