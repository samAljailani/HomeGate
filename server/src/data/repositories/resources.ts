export type RepositoryErrorMessages = {
    conflict: string
    notFound: string
    badRequest: string
    unavailable: string
    fallback: string
}

export type RepositoryResourceKey =
    | 'authScheme'
    | 'config'
    | 'invite'
    | 'logging'
    | 'oauthProvider'
    | 'service'
    | 'session'
    | 'user'
    | 'subscription'
    | 'externalUserAccount'
    | 'userOAuthIdentity'

export const repositoryErrorMessages: Record<RepositoryResourceKey, RepositoryErrorMessages> = {
    user: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    userOAuthIdentity: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    subscription: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    externalUserAccount: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    oauthProvider: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    authScheme: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    session: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    service: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    logging: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    config: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
    invite: {
        conflict: 'Request conflicts with existing data.',
        notFound: 'Requested resource was not found.',
        badRequest: 'Request data is invalid.',
        unavailable: 'Service is temporarily unavailable. Please try again.',
        fallback: 'Unable to process the request at this time.',
    },
}
