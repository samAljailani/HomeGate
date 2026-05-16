import { GoogleOAuthGuard } from "@/middleware/google-oauth.guard";

export const middleware = [
    GoogleOAuthGuard
]