import { Injectable, Inject } from '@nestjs/common'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ScheduledTasks } from '@/types/enums'
import { Task } from '@/decorators'
import { SubscriptionService } from './subscriptions.service'
import { CronExpression } from '@nestjs/schedule'

@Injectable()
export class TaskService extends BaseService {
    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(SubscriptionService) private subscriptionService: SubscriptionService
    ) {
        super(logger)
    }

    @Task({ name: ScheduledTasks.PROCESS_SUBSCRIPTIONS, cronExpression: CronExpression.EVERY_HOUR, runOnStartup: true })
    async processSubscriptionsHandler(): Promise<boolean> {
        let success = false
        try {
            success = await this.subscriptionService.processSubscriptions()
        } catch (error) {
            this.logger.error(`A failure occurred executing the '${ScheduledTasks.PROCESS_SUBSCRIPTIONS}' task`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })
        }

        return success
    }

    @Task({
        name: ScheduledTasks.SYNC_CLIENT_ACCOUNTS,
        cronExpression: CronExpression.EVERY_12_HOURS,
        runOnStartup: true,
    })
    async syncClientAccountsHandler(): Promise<boolean> {
        let success = false
        try {
            success = await this.subscriptionService.syncClientAccounts()
        } catch (error) {
            this.logger.error(`A failure occurred executing the '${ScheduledTasks.SYNC_CLIENT_ACCOUNTS}' task`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })
        }

        return success
    }

    @Task({
        name: ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS,
        cronExpression: CronExpression.EVERY_12_HOURS,
        runOnStartup: true,
    })
    async cleanupStaleLocalAccountsHandler(): Promise<boolean> {
        let success = false
        try {
            success = await this.subscriptionService.cleanupStaleLocalAccounts()
        } catch (error) {
            this.logger.error(
                `A failure occurred executing the '${ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS}' task`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )
        }

        return success
    }
}
