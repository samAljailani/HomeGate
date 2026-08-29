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
        providers: 'providers',
    }),
    csrf: defineRoutes('/api/csrf', {}),
    subscriptions: defineRoutes('/api/subscriptions', {
        subscribe: '',
        list: '',
        me: 'me',
        get: ':id',
        update: ':id',
        autoRenew: ':id/auto-renew',
        renew: ':id/renew',
        delete: ':id',
        resetPassword: ':id/reset-password',
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
        stats: 'stats',
        avatar: 'me/avatar',
        listPolicies: ':id/service-policies',
        setPolicy: ':id/service-policies',
        deletePolicy: ':id/service-policies/:serviceId',
    }),
    services: defineRoutes('/api/services', {
        list: '',
        create: '',
        update: ':slug',
        accounts: ':slug/accounts',
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
        start: ':name/start',
        stop: ':name/stop',
        run: ':name/run',
    }),
    sessions: defineRoutes('/api/sessions', {
        list: '',
        revoke: ':id',
        config: 'config',
    }),
    dashboard: defineRoutes('/api/dashboard', {
        stats: 'stats',
    }),
    test: defineRoutes('/api/test', {}),
} satisfies RoutesConfig

export const clientRoutes = {
    home: '/',
    signIn: '/signin',
    account: '/account',
    admin: '/admin',
    adminDashboard: '/admin/dashboard',
    adminInvites: '/admin/invites',
    adminUsers: '/admin/users',
    adminServices: '/admin/services',
    adminOAuthProviders: '/admin/oauth-providers',
    adminSubscriptions: '/admin/subscriptions',
    adminLogs: '/admin/logs',
    adminScheduledTasks: '/admin/scheduled-tasks',
    adminSessions: '/admin/sessions',
    error: '/error',
} as const

