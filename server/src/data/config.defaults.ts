import { CronExpression } from '@nestjs/schedule'
import { ScheduledTasks } from '@/types/enums'
import { SystemConfigKey, SystemConfigMap, TasksSystemConfig } from '@/types/models/SystemConfig'

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

export const systemDefaults: Readonly<SystemConfigMap> = Object.freeze({
    [SystemConfigKey.TASKS]: taskDefaults,
})
