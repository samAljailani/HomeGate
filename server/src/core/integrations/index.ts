import { ImmichIntegration } from './immich/immich.integration'
import { JellyfinIntegration } from './jellyfin/jellyfin.integration'

//do NOT include the registry in the providers list.
export const accountIntegrationProviders = [JellyfinIntegration, ImmichIntegration]
