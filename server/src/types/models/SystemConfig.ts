import { ScheduledTasks } from '../enums'

export enum SystemConfigKey {
    TASKS = 'tasks',
}

export type TaskConfig = {
    enabled: boolean
    runOnStartup: boolean
    cronExpression: string
}

export type TasksSystemConfig = Record<ScheduledTasks, TaskConfig>

export type SystemConfigMap = {
    [SystemConfigKey.TASKS]: TasksSystemConfig
}
