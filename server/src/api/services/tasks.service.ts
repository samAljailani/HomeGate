import { Injectable, Inject } from '@nestjs/common'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ScheduledTasks } from '@/types/enums'
import { Task } from '@/decorators'
import { SubscriptionLifecycleService } from './subscriptionLifecycle.service'
import { UserService } from './user.service'
import { ITaskRunRepository } from '@/data/repositories/ITaskRunRepository'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { DELETED_USER_RETENTION_DAYS, LOG_RETENTION_DAYS, TASK_RUN_RETENTION_DAYS } from '@/types/task.constants'
import { LogService } from './log.service'

@Injectable()
export class TaskService extends BaseService {
    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(SubscriptionLifecycleService) private subscriptionLifecycle: SubscriptionLifecycleService,
        @Inject(UserService) private userService: UserService,
        @Inject(LogService) private logService: LogService,
        @Inject(ISessionRepository) private sessionRepository: ISessionRepository,
        @Inject(ITaskRunRepository) private taskRunRepository: ITaskRunRepository
    ) {
        super(logger)
    }

    @Task(ScheduledTasks.PROCESS_SUBSCRIPTIONS)
    async processSubscriptionsHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.PROCESS_SUBSCRIPTIONS, () =>
            this.subscriptionLifecycle.processSubscriptions()
        )
    }

    @Task(ScheduledTasks.SYNC_INTEGRATION_ACCOUNTS)
    async syncIntegrationAccountsHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.SYNC_INTEGRATION_ACCOUNTS, () =>
            this.subscriptionLifecycle.syncIntegrationAccounts()
        )
    }

    @Task(ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS)
    async cleanupStaleLocalAccountsHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS, () =>
            this.subscriptionLifecycle.cleanupStaleLocalAccounts()
        )
    }

    @Task(ScheduledTasks.CLEANUP_DELETED_USERS)
    async cleanupDeletedUsersHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.CLEANUP_DELETED_USERS, () =>
            this.userService.purgeDeletedUsers(DELETED_USER_RETENTION_DAYS)
        )
    }

    @Task(ScheduledTasks.PURGE_OLD_LOGS)
    async purgeOldLogsHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.PURGE_OLD_LOGS, () => this.logService.purgeOldLogs(LOG_RETENTION_DAYS))
    }

    @Task(ScheduledTasks.PURGE_OLD_TASK_RUNS)
    async purgeOldTaskRunsHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.PURGE_OLD_TASK_RUNS, async () => {
            const cutoff = new Date(Date.now() - TASK_RUN_RETENTION_DAYS * 24 * 60 * 60_000)
            const deleted = await this.taskRunRepository.deleteOlderThan(cutoff)
            if (deleted > 0) {
                this.logger.log(`Purged ${deleted} task run record(s) older than ${TASK_RUN_RETENTION_DAYS} days`)
            }
            return true
        })
    }

    @Task(ScheduledTasks.PURGE_EXPIRED_SESSIONS)
    async purgeExpiredSessionsHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.PURGE_EXPIRED_SESSIONS, async () => {
            const deleted = await this.sessionRepository.deleteExpired(new Date())
            if (deleted > 0) {
                this.logger.log(`Purged ${deleted} expired session(s)`)
            }
            return true
        })
    }

    /**
     * Runs a task's work function with consistent start/success/failure logging and timing.
     * Never throws — failures are logged and reported back as a `false` success status.
     * Every execution is persisted to the TaskRun table for admin visibility.
     */
    private async runTask(taskName: ScheduledTasks, work: () => Promise<boolean>): Promise<boolean> {
        const startedAt = new Date()
        const elapsedMs = () => Date.now() - startedAt.getTime()

        this.logger.debugFn(() => `Task '${taskName}' started`)

        let success = false
        let errorMessage: string | null = null

        try {
            success = await work()

            this.logger.debugFn(() => `Task '${taskName}' finished in ${elapsedMs()}ms with success=${success}`)
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : String(error)

            this.logger.error(`Task '${taskName}' failed after ${elapsedMs()}ms`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })
        }

        try {
            await this.taskRunRepository.create({
                taskName,
                startedAt,
                finishedAt: new Date(),
                success,
                errorMessage,
            })
        } catch (error) {
            this.logger.error(`Failed to persist task run record for '${taskName}'`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })
        }

        return success
    }
}
