import { AuthController } from './auth.controller'
import { CsrfController } from './csrf.controller'
import { InviteController } from './invite.controller'
import { LogController } from './log.controller'
import { OAuthProviderController } from './oauthProvider.controller'
import { ServiceController } from './service.controller'
import { SubscriptionController } from './subscriptions.controller'
import { TestController } from './test.controller'
import { UserController } from './user.controller'

export const controllers = [
    TestController,
    AuthController,
    CsrfController,
    SubscriptionController,
    InviteController,
    UserController,
    ServiceController,
    OAuthProviderController,
    LogController,
]
