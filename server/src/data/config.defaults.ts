import { CronExpression } from '@nestjs/schedule'
import { ScheduledTasks, ImmichProvisioningMode } from '@/types/enums'
import { SystemConfigKey, SystemConfigMap, TasksSystemConfig, JellyfinSystemConfig, ImmichSystemConfig } from '@/types/models/SystemConfig'

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
    [ScheduledTasks.CLEANUP_PENDING_USERS]: {
        enabled: true,
        runOnStartup: true,
        cronExpression: '*/2 * * * *',
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

export const systemDefaults: Readonly<SystemConfigMap> = Object.freeze({
    [SystemConfigKey.TASKS]: taskDefaults,
    [SystemConfigKey.JELLYFIN]: jellyfinDefaults,
    [SystemConfigKey.IMMICH]: immichDefaults,
})
