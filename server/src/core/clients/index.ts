import { ImmichClient } from './immich/immich.client'
import { JellyfinClient } from './jellyfin/jellyfin.client'

//do NOT include the registery in the clients list.
export const clients = [JellyfinClient, ImmichClient]
