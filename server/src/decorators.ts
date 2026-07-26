import { SetMetadata } from '@nestjs/common'
import { ScheduledTasks } from './types/enums'

export const IS_PUBLIC = 'isPublic'
export const IS_ADMIN = 'isAdmin'
export const TASK = 'task'

export const Public = () => SetMetadata(IS_PUBLIC, true)
export const AdminRoute = () => SetMetadata(IS_ADMIN, true)

export const Task = (name: ScheduledTasks) => SetMetadata(TASK, name)
