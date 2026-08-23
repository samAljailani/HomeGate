import { CreateTaskRunModel, TaskRunModel } from '@/types/models/tasks'

export const ITaskRunRepository = Symbol('ITaskRunRepository')

export interface ITaskRunRepository {
    create(run: CreateTaskRunModel): Promise<TaskRunModel>
    findLatest(taskName: string): Promise<TaskRunModel | null>
    findLatestSuccessful(taskName: string): Promise<TaskRunModel | null>
    findRecent(taskName: string, take?: number): Promise<TaskRunModel[]>
    deleteOlderThan(cutoff: Date): Promise<number>
}
