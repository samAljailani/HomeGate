import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { ITaskRunRepository } from './ITaskRunRepository'
import { CreateTaskRunModel, TaskRunModel } from '@/types/models/tasks'
import type { TaskRunModel as PrismaTaskRun } from '@prisma/generated/models/TaskRun'
import { mapPrismaError } from './util'

@Injectable()
export class TaskRunRepository extends BaseRepository implements ITaskRunRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapTaskRun(taskRun: PrismaTaskRun): TaskRunModel {
        return {
            id: taskRun.id,
            taskName: taskRun.taskName,
            startedAt: taskRun.startedAt,
            finishedAt: taskRun.finishedAt,
            success: taskRun.success,
            errorMessage: taskRun.errorMessage,
        }
    }

    async create(run: CreateTaskRunModel): Promise<TaskRunModel> {
        try {
            const taskRun = await this.db.taskRun.create({ data: run })
            return this.mapTaskRun(taskRun)
        } catch (error) {
            this.logger.error(`create failed for taskName: ${run.taskName}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error)
        }
    }

    async findLatest(taskName: string): Promise<TaskRunModel | null> {
        try {
            const taskRun = await this.db.taskRun.findFirst({
                where: { taskName },
                orderBy: { startedAt: 'desc' },
            })
            return taskRun ? this.mapTaskRun(taskRun) : null
        } catch (error) {
            this.logger.error(`findLatest failed for taskName: ${taskName}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error)
        }
    }

    async findLatestSuccessful(taskName: string): Promise<TaskRunModel | null> {
        try {
            const taskRun = await this.db.taskRun.findFirst({
                where: { taskName, success: true },
                orderBy: { startedAt: 'desc' },
            })
            return taskRun ? this.mapTaskRun(taskRun) : null
        } catch (error) {
            this.logger.error(`findLatestSuccessful failed for taskName: ${taskName}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error)
        }
    }

    async findRecent(taskName: string, take: number = 20): Promise<TaskRunModel[]> {
        try {
            const taskRuns = await this.db.taskRun.findMany({
                where: { taskName },
                orderBy: { startedAt: 'desc' },
                take,
            })
            return taskRuns.map((taskRun) => this.mapTaskRun(taskRun))
        } catch (error) {
            this.logger.error(`findRecent failed for taskName: ${taskName}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error)
        }
    }

    async deleteOlderThan(cutoff: Date): Promise<number> {
        try {
            const result = await this.db.taskRun.deleteMany({
                where: { startedAt: { lt: cutoff } },
            })
            return result.count
        } catch (error) {
            this.logger.error('deleteOlderThan failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error)
        }
    }
}
