import { SetMetadata } from '@nestjs/common'
import { validateCronExpression } from 'cron'
import { TaskMetadata } from './types/models/tasks'

export const IS_PUBLIC = 'isPublic'
export const IS_ADMIN = 'isAdmin'
export const TASK = 'task'

export const Public = () => SetMetadata(IS_PUBLIC, true)
export const AdminRoute = () => SetMetadata(IS_ADMIN, true)

export const Task = (task: TaskMetadata) => {
    const validated = validateCronExpression(task.cronExpression)

    if (!validated.valid) {
        throw new Error(`Invalid cron expression. ${validated.error?.message ?? ''}`)
    }

    return SetMetadata(TASK, task)
}
