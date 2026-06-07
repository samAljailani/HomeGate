import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard } from '@nestjs/throttler'

import { AuthGuard } from '@/api/middleware/auth.guard'
import { GoogleOAuthGuard } from '@/api/middleware/google-oauth.guard'

export const middleware = [
    GoogleOAuthGuard,
    {
        provide: APP_GUARD,
        useClass: AuthGuard,
    },
    {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
    },
]
