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
    basePath: string
    subPath: T
} & { [K in keyof T]: string }

// RoutesConfig avoids RouteGroup<Record<string,string>> — subPath (object) conflicts with the index signature
type RoutesConfig = Record<string, { basePath: string; subPath: Record<string, string> }>

function defineRoutes<T extends Record<string, string>>(basePath: string, subRoutes: T): RouteGroup<T> {
    const full = Object.fromEntries(
        Object.entries(subRoutes).map(([k, v]) => [k, `${basePath}/${v}`.replace(/\/+/g, '/')])
    ) as { [K in keyof T]: string }

    return {
        basePath,
        ...full,
        subPath: subRoutes,
    }
}

export const routes = {
    auth: defineRoutes('/api/auth', {
        join: 'join',
        google: 'google',
        googleRedirect: 'google/redirect',
        signOut: 'signOut',
        session: 'session',
    }),
    csrf: defineRoutes('/api/csrf', {}),
    subscriptions: defineRoutes('/api/subscriptions', {
        subscribe: '',
        list: '',
        me: 'me',
        get: ':id',
        update: ':id',
        renew: ':id/renew',
        delete: ':id',
    }),
    invites: defineRoutes('/api/invites', {
        create: '',
        list: '',
        update: ':id',
        delete: ':id',
    }),
    users: defineRoutes('/api/users', {
        list: '',
        get: ':id',
        update: ':id',
        delete: ':id',
        stats: 'stats'
    }),
    services: defineRoutes('/api/services', {
        list: '',
        update: ':name',
        accounts: ':name/accounts',
    }),
    oauthProviders: defineRoutes('/api/oauth-providers', {
        list: '',
        update: ':id',
    }),
    logs: defineRoutes('/api/logs', {
        list: '',
    }),
    tasks: defineRoutes('/api/tasks', {
        list: '',
        update: ':name',
    }),
    test: defineRoutes('/api/test', {}),
} satisfies RoutesConfig

export const clientRoutes = {
    home: '/',
    signIn: '/signin',
    admin: '/admin',
    adminInvites: '/admin/invites',
    adminUsers: '/admin/users',
    error: '/error',
} as const

