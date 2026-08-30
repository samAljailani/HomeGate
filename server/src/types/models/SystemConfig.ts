import { ScheduledTasks, ImmichProvisioningMode } from '../enums'

export enum SystemConfigKey {
    TASKS = 'tasks',
    JELLYFIN = 'jellyfin',
    IMMICH = 'immich',
    SESSIONS = 'sessions',
    SUBSCRIPTIONS = 'subscriptions',
}

export type TaskConfig = {
    enabled: boolean
    runOnStartup: boolean
    cronExpression: string
}

export type TasksSystemConfig = Record<ScheduledTasks, TaskConfig>

export type JellyfinSystemConfig = {
    baseUrl: string
    apiKey: string
    clientName: string
    deviceId: string
}

export type ImmichSystemConfig = {
    baseUrl: string
    apiKey: string
    provisioningMode: ImmichProvisioningMode
}

export type SessionsSystemConfig = {
    maxPerUser: number
}

export type SubscriptionsSystemConfig = {
    defaultExpiryDays: number
}

export type SystemConfigMap = {
    [SystemConfigKey.TASKS]: TasksSystemConfig
    [SystemConfigKey.JELLYFIN]: JellyfinSystemConfig
    [SystemConfigKey.IMMICH]: ImmichSystemConfig
    [SystemConfigKey.SESSIONS]: SessionsSystemConfig
    [SystemConfigKey.SUBSCRIPTIONS]: SubscriptionsSystemConfig
}
