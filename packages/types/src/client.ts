import createClient, { type Client, type ClientOptions } from 'openapi-fetch'

import type { paths } from './schema'

export const createApiClient = (options: ClientOptions): Client<paths> => createClient<paths>(options)

export type ApiClient = ReturnType<typeof createApiClient>
