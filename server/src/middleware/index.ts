import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard } from '@nestjs/throttler'

import { AuthGuard } from '@/middleware/auth.guard'
import { GoogleOAuthGuard } from '@/middleware/google-oauth.guard'

export const middleware = [
    GoogleOAuthGuard,
    {
        provide: APP_GUARD,
        useClass: AuthGuard,
    },
    {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
    }
]
