import { APP_GUARD } from '@nestjs/core';
import { GoogleOAuthGuard } from "@/middleware/google-oauth.guard";
import { AuthGuard } from '@/middleware/auth.guard';

export const middleware = [
    GoogleOAuthGuard,
    {
        provide: APP_GUARD,
        useClass: AuthGuard,
    },
]