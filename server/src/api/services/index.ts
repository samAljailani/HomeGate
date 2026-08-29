import { AuthService } from './auth.service'
import { ConfigService } from './config.service'
import { DashboardService } from './dashboard.service'
import { InviteService } from './invite.service'
import { InviteAccountLinkingService } from './inviteAccountLinking.service'
import { LogService } from './log.service'
import { OAuthProviderManagementService } from './oauthProviderManagement.service'
import { SchedulerService } from './scheduler.service'
import { ServiceManagementService } from './serviceManagement.service'
import { SessionService } from './session.service'
import { SubscriptionService } from './subscriptions.service'
import { SubscriptionLifecycleService } from './subscriptionLifecycle.service'
import { TaskService } from './tasks.service'
import { UserService } from './user.service'
import { subscriptionProvisioners } from '@/core/subscriptions/provisioners'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'

export const services = [
    ConfigService,
    UserService,
    AuthService,
    SubscriptionService,
    SubscriptionLifecycleService,
    SubscriptionCascadeService,
    ...subscriptionProvisioners,
    InviteService,
    InviteAccountLinkingService,
    ServiceManagementService,
    OAuthProviderManagementService,
    LogService,
    TaskService,
    SchedulerService,
    SessionService,
    DashboardService,
]
