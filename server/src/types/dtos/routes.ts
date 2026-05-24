/**
 * A route group has a basePath (for @Controller()), relative subPaths (for @Get() etc.),
 * and spreads the full paths at the top level for client-side use.
 *
 * Example:
 *   routes.auth.basePath        → '/api/auth'       use in @Controller()
 *   routes.auth.subPath.google  → 'google'           use in @Get()
 *   routes.auth.google          → '/api/auth/google' use on the client
 */

type RouteGroup<T extends Record<string, string>> = {
    basePath: string;
    subPath: T;
} & { [K in keyof T]: string };

// RoutesConfig avoids RouteGroup<Record<string,string>> — subPath (object) conflicts with the index signature
type RoutesConfig = Record<string, { basePath: string; subPath: Record<string, string> }>;

function defineRoutes<T extends Record<string, string>>(basePath: string, subRoutes: T): RouteGroup<T> {
    const full = Object.fromEntries(
        Object.entries(subRoutes).map(([k, v]) => [k, `${basePath}/${v}`.replace(/\/+/g, '/')])
    ) as { [K in keyof T]: string };

    return {
        basePath,
        ...full,
        subPath: subRoutes,
    };
}

export const routes = {
    auth: defineRoutes('/api/auth', {
        google: 'google',
        googleRedirect: 'google/redirect',
    }),
    test: defineRoutes('/api/test', {})
} satisfies RoutesConfig;

export const clientRoutes = {
    home: '/',
    signIn: '/signIn',
    signout: '/signOut',
} as const;