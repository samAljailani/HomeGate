import { ScheduledTasks } from '../enums'

export type TaskHandler = () => Promise<boolean>

export type DiscoveredTask = {
    handler: TaskHandler
    name: ScheduledTasks
}
