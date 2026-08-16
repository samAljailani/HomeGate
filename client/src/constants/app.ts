export const config = Object.freeze({
    appName: 'HomeGate',
    // Falls back to empty string (same-origin) in production builds
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
    routes: {
        home: '/',
        signIn: '/signin',
        admin: '/admin',
        invites: '/admin/invites',
    },
})
