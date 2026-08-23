import { ScheduledTasks } from '../enums'

export type TaskHandler = () => Promise<boolean>

export type DiscoveredTask = {
    handler: TaskHandler
    name: ScheduledTasks
}

export type TaskRunModel = {
    id: string
    taskName: string
    startedAt: Date
    finishedAt: Date
    success: boolean
    errorMessage: string | null
}

export type CreateTaskRunModel = Omit<TaskRunModel, 'id'>
