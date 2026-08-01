import createClient, { type ClientOptions } from 'openapi-fetch'

import type { paths } from './schema'

export const createApiClient = (options: ClientOptions) => createClient<paths>(options)

export type ApiClient = ReturnType<typeof createApiClient>
