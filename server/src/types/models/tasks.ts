import { CronExpression } from '@nestjs/schedule'
import { ScheduledTasks } from '../enums'

export type TaskHandler = () => Promise<boolean>

export type TaskMetadata = {
    name: ScheduledTasks
    cronExpression: CronExpression | string
}

export type DiscoveredTask = {
    handler: TaskHandler
    metadata: TaskMetadata
}
