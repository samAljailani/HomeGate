import { LoggingProvider } from '@/infrastructure/logger.provider'
import { Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { BaseService } from './base.service'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { TASK } from '@/decorators'
import { DiscoveredTask, TaskHandler, TaskMetadata } from '@/types/models/tasks'
import { CronJob } from 'cron'

@Injectable()
export class SchedulerService extends BaseService implements OnApplicationBootstrap, OnModuleDestroy {
    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(Reflector) private reflector: Reflector,
        @Inject(DiscoveryService) private discoveryService: DiscoveryService,
        @Inject(MetadataScanner) private metadataScanner: MetadataScanner,
        @Inject(SchedulerRegistry) private schedulerRegistry: SchedulerRegistry
    ) {
        super(logger)
    }

    async onApplicationBootstrap(): Promise<void> {
        await this.startAll()
    }

    async onModuleDestroy(): Promise<void> {
        await this.stopAll()
    }

    async startAll(): Promise<void> {
        const tasks = this.discoverTasks()

        this.logger.log(`Discovered ${tasks.length} scheduled task(s)`)

        for (const task of tasks) {
            if (task.metadata.enabled === false) {
                this.logger.log(`Skipping disabled task '${task.metadata.name}'`)
                continue
            }

            const job = this.create(task.metadata, task.handler)

            if (job && task.metadata.runOnStartup) {
                this.logger.log(`Running task '${task.metadata.name}' immediately on startup`)
                try {
                    // Fire through the job itself so the execution is tracked (lastExecution)
                    // and waitForCompletion serializes it against scheduled ticks.
                    await job.fireOnTick()
                } catch (error) {
                    this.logger.error(`Startup execution of task '${task.metadata.name}' failed`, {
                        stackTrace: error instanceof Error ? error.stack : String(error),
                    })
                }
            }
        }
    }

    async stopAll(): Promise<void> {
        const jobs = this.schedulerRegistry.getCronJobs()

        for (const [name, job] of jobs) {
            try {
                // Waits for an in-flight tick to finish when waitForCompletion is enabled.
                await job.stop()
                this.logger.log(`Stopped cron job '${name}' during shutdown`)
            } catch (error) {
                this.logger.error(`Failed to stop cron job '${name}' during shutdown`, {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                })
            }
        }
    }

    start(taskMetadata: TaskMetadata): void {
        if (!this.schedulerRegistry.doesExist('cron', taskMetadata.name)) {
            this.logger.warn(`Cannot start cron job '${taskMetadata.name}': job is not registered`)
            return
        }
        const task = this.schedulerRegistry.getCronJob(taskMetadata.name)

        if (!task.isActive) {
            task.start()
            this.logger.log(`Started cron job '${taskMetadata.name}'`)
        }
    }

    stop(taskMetadata: TaskMetadata): void {
        if (!this.schedulerRegistry.doesExist('cron', taskMetadata.name)) {
            this.logger.warn(`Cannot stop cron job '${taskMetadata.name}': job is not registered`)
            return
        }

        const task = this.schedulerRegistry.getCronJob(taskMetadata.name)

        if (task.isActive) {
            task.stop()
            this.logger.log(`Stopped cron job '${taskMetadata.name}'`)
        }
    }

    create(taskMetadata: TaskMetadata, handler: TaskHandler): CronJob | undefined {
        if (this.schedulerRegistry.doesExist('cron', taskMetadata.name)) {
            this.logger.warn(`Cron job '${taskMetadata.name}' is already registered — skipping duplicate`)
            return undefined
        }

        const job = CronJob.from({
            cronTime: taskMetadata.cronExpression,
            onTick: async () => {
                await handler()
            },
            errorHandler: (error) => {
                this.logger.error(`Execution of task '${taskMetadata.name}' failed`, {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                })
            },
            start: true,
            waitForCompletion: true,
            timeZone: 'UTC',
        })
        this.schedulerRegistry.addCronJob(taskMetadata.name, job)

        this.logger.log(`Registered cron job '${taskMetadata.name}' with expression '${taskMetadata.cronExpression}'`)

        return job
    }

    private discoverTasks(): DiscoveredTask[] {
        const tasks: DiscoveredTask[] = []

        for (const wrapper of this.discoveryService.getProviders()) {
            const { instance } = wrapper
            if (!instance || !Object.getPrototypeOf(instance)) continue

            const prototype = Object.getPrototypeOf(instance)

            for (const methodName of this.metadataScanner.getAllMethodNames(prototype)) {
                const metadata = this.reflector.get<TaskMetadata>(TASK, instance[methodName])

                if (!metadata) {
                    continue
                }

                if (instance[methodName].length !== 0) {
                    this.logger.warn(
                        `Task '${metadata.name}' on '${instance.constructor.name}.${methodName}' expects ` +
                            `${instance[methodName].length} argument(s) and will be skipped — task handlers must accept no arguments`
                    )
                    continue
                }

                tasks.push({
                    handler: (instance[methodName] as TaskHandler).bind(instance),
                    metadata,
                })
            }
        }

        return tasks
    }
}
