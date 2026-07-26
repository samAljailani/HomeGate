import { Injectable, Inject } from '@nestjs/common'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ScheduledTasks } from '@/types/enums'
import { Task } from '@/decorators'
import { SubscriptionService } from './subscriptions.service'

@Injectable()
export class TaskService extends BaseService {
    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(SubscriptionService) private subscriptionService: SubscriptionService
    ) {
        super(logger)
    }

    @Task(ScheduledTasks.PROCESS_SUBSCRIPTIONS)
    async processSubscriptionsHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.PROCESS_SUBSCRIPTIONS, () => this.subscriptionService.processSubscriptions())
    }

    @Task(ScheduledTasks.SYNC_CLIENT_ACCOUNTS)
    async syncClientAccountsHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.SYNC_CLIENT_ACCOUNTS, () => this.subscriptionService.syncClientAccounts())
    }

    @Task(ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS)
    async cleanupStaleLocalAccountsHandler(): Promise<boolean> {
        return this.runTask(ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS, () =>
            this.subscriptionService.cleanupStaleLocalAccounts()
        )
    }

    /**
     * Runs a task's work function with consistent start/success/failure logging and timing.
     * Never throws — failures are logged and reported back as a `false` success status.
     */
    private async runTask(taskName: ScheduledTasks, work: () => Promise<boolean>): Promise<boolean> {
        const startedAt = Date.now()
        const elapsedMs = () => Date.now() - startedAt

        this.logger.debugFn(() => `Task '${taskName}' started`)

        try {
            const success = await work()

            this.logger.debugFn(() => `Task '${taskName}' finished in ${elapsedMs()}ms with success=${success}`)

            return success
        } catch (error) {
            this.logger.error(`Task '${taskName}' failed after ${elapsedMs()}ms`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            return false
        }
    }
}
