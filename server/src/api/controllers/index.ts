import { AuthController } from './auth.controller'
import { CsrfController } from './csrf.controller'
import { InviteController } from './invite.controller'
import { SubscriptionController } from './subscriptions.controller'
import { TestController } from './test.controller'

export const controllers = [TestController, AuthController, CsrfController, SubscriptionController, InviteController]
