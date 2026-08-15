import { AuthController } from './auth.controller'
import { ClientRouteController } from './client-routes'
import { CsrfController } from './csrf.controller'
import { InviteController } from './invite.controller'
import { LogController } from './log.controller'
import { OAuthProviderController } from './oauthProvider.controller'
import { ServiceController } from './service.controller'
import { SubscriptionController } from './subscriptions.controller'
import { TaskController } from './task.controller'
import { UserController } from './user.controller'

export const controllers = [
    AuthController,
    CsrfController,
    SubscriptionController,
    InviteController,
    UserController,
    ServiceController,
    OAuthProviderController,
    LogController,
    TaskController,
    ClientRouteController, //must be registered last due to its generatlized pattern matching
]
