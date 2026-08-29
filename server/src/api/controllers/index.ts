import { AuthController } from './auth.controller'
import { ForwardAuthController } from './forwardAuth.controller'
import { ClientRouteController } from './client-routes'
import { CsrfController } from './csrf.controller'
import { DashboardController } from './dashboard.controller'
import { HealthController } from './health.controller'
import { InviteController } from './invite.controller'
import { LogController } from './log.controller'
import { OAuthProviderController } from './oauthProvider.controller'
import { ServiceController } from './service.controller'
import { SessionController } from './session.controller'
import { SubscriptionController } from './subscriptions.controller'
import { TaskController } from './task.controller'
import { UserController } from './user.controller'

export const controllers = [
    HealthController,
    AuthController,
    ForwardAuthController,
    CsrfController,
    SubscriptionController,
    InviteController,
    UserController,
    ServiceController,
    OAuthProviderController,
    LogController,
    TaskController,
    SessionController,
    DashboardController,
    ClientRouteController, //must be registered last due to its generatlized pattern matching
]
