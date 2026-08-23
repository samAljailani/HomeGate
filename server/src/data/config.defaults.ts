import { CronExpression } from '@nestjs/schedule'
import { ScheduledTasks, ImmichProvisioningMode } from '@/types/enums'
import { SystemConfigKey, SystemConfigMap, TasksSystemConfig, JellyfinSystemConfig, ImmichSystemConfig, SessionsSystemConfig } from '@/types/models/SystemConfig'

const taskDefaults: TasksSystemConfig = Object.freeze({
    [ScheduledTasks.PROCESS_SUBSCRIPTIONS]: {
        enabled: true,
        runOnStartup: true,
        cronExpression: CronExpression.EVERY_HOUR,
    },
    [ScheduledTasks.SYNC_CLIENT_ACCOUNTS]: {
        enabled: true,
        runOnStartup: true,
        cronExpression: CronExpression.EVERY_12_HOURS,
    },
    [ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS]: {
        enabled: true,
        runOnStartup: true,
        cronExpression: CronExpression.EVERY_12_HOURS,
    },
    [ScheduledTasks.CLEANUP_DELETED_USERS]: {
        enabled: true,
        runOnStartup: false,
        cronExpression: CronExpression.EVERY_DAY_AT_MIDNIGHT,
    },
    [ScheduledTasks.PURGE_OLD_LOGS]: {
        enabled: true,
        runOnStartup: false,
        cronExpression: CronExpression.EVERY_DAY_AT_1AM,
    },
    [ScheduledTasks.PURGE_OLD_TASK_RUNS]: {
        enabled: true,
        runOnStartup: false,
        cronExpression: CronExpression.EVERY_DAY_AT_2AM,
    },
    [ScheduledTasks.PURGE_EXPIRED_SESSIONS]: {
        enabled: true,
        runOnStartup: false,
        cronExpression: CronExpression.EVERY_DAY_AT_3AM,
    },
}) as TasksSystemConfig

const jellyfinDefaults: JellyfinSystemConfig = Object.freeze({
    baseUrl: '',
    apiKey: '',
    clientName: 'HOMEGATE_v1.0.0',
    deviceId: 'homegate_server',
})

const immichDefaults: ImmichSystemConfig = Object.freeze({
    baseUrl: '',
    apiKey: '',
    provisioningMode: ImmichProvisioningMode.Local,
})

const sessionsDefaults: SessionsSystemConfig = Object.freeze({
    maxPerUser: 10,
})

export const systemDefaults: Readonly<SystemConfigMap> = Object.freeze({
    [SystemConfigKey.TASKS]: taskDefaults,
    [SystemConfigKey.JELLYFIN]: jellyfinDefaults,
    [SystemConfigKey.IMMICH]: immichDefaults,
    [SystemConfigKey.SESSIONS]: sessionsDefaults,
})
