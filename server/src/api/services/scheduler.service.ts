import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BadRequestException, Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { BaseService } from './base.service'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { TASK } from '@/decorators'
import { DiscoveredTask, TaskHandler } from '@/types/models/tasks'
import { CronJob, CronTime, validateCronExpression } from 'cron'
import { TaskService } from './tasks.service'
import { ISystemMetadataRepository } from '@/data/repositories/ISystemMetadataRepository'
import { SystemConfigKey, TaskConfig } from '@/types/models/SystemConfig'
import { ScheduledTasks } from '@/types/enums'
import { TaskConfigResponseDto, UpdateTaskConfigDto } from '@/types/dtos/taskDto'

@Injectable()
export class SchedulerService extends BaseService implements OnApplicationBootstrap, OnModuleDestroy {
    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(Reflector) private reflector: Reflector,
        @Inject(DiscoveryService) private discoveryService: DiscoveryService,
        @Inject(MetadataScanner) private metadataScanner: MetadataScanner,
        @Inject(SchedulerRegistry) private schedulerRegistry: SchedulerRegistry,
        @Inject(ISystemMetadataRepository) private systemMetadataRepository: ISystemMetadataRepository
    ) {
        super(logger)
    }

    // #region Lifecycle

    async onApplicationBootstrap(): Promise<void> {
        await this.startAll()
    }

    async onModuleDestroy(): Promise<void> {
        await this.stopAll()
    }

    async startAll(): Promise<void> {
        const tasks = this.discoverTasks()
        // Returns DB values merged over code defaults; if no DB row exists, returns a clone of defaults.
        const taskConfig = await this.systemMetadataRepository.get(SystemConfigKey.TASKS)

        // Validate: every discovered task must have a config entry (from defaults or DB).
        // If neither has it, fail fast — add an entry to config.defaults.ts.
        for (const task of tasks) {
            if (!taskConfig[task.name]) {
                throw new Error(
                    `Discovered task '${task.name}' has no configuration in defaults or database. ` +
                        `Add an entry to config.defaults.ts for this task.`
                )
            }
        }

        this.logger.log(`Discovered ${tasks.length} scheduled task(s)`)

        for (const task of tasks) {
            const config = taskConfig[task.name]

            if (!config || config.enabled === false) {
                this.logger.log(`Skipping disabled task '${task.name}'`)
                continue
            }

            const job = this.create(task.name, config.cronExpression, task.handler)

            if (job && config.runOnStartup) {
                this.logger.log(`Running task '${task.name}' immediately on startup`)
                try {
                    await job.fireOnTick()
                } catch (error) {
                    this.logger.error(`Startup execution of task '${task.name}' failed`, {
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

    // #endregion Lifecycle

    // #region Task Configuration

    async getTaskConfigs(): Promise<TaskConfigResponseDto[]> {
        const taskConfig = await this.systemMetadataRepository.get(SystemConfigKey.TASKS)

        return Object.values(ScheduledTasks).map((name) => {
            const config = taskConfig[name]
            const isActive = this.schedulerRegistry.doesExist('cron', name)
                ? this.schedulerRegistry.getCronJob(name).isActive
                : false

            return {
                name,
                enabled: config.enabled,
                runOnStartup: config.runOnStartup,
                cronExpression: config.cronExpression,
                isActive,
            }
        })
    }

    async updateTask(taskName: ScheduledTasks, dto: UpdateTaskConfigDto): Promise<TaskConfigResponseDto> {
        if (dto.cronExpression !== undefined) {
            const validation = validateCronExpression(dto.cronExpression)
            if (!validation.valid) {
                throw new BadRequestException(
                    `Invalid cron expression: ${validation.error?.message ?? 'unknown error'}`
                )
            }
        }

        const taskConfig = await this.systemMetadataRepository.get(SystemConfigKey.TASKS)
        const current = taskConfig[taskName]

        const updated: TaskConfig = {
            enabled: dto.enabled ?? current.enabled,
            runOnStartup: dto.runOnStartup ?? current.runOnStartup,
            cronExpression: dto.cronExpression ?? current.cronExpression,
        }

        taskConfig[taskName] = updated
        await this.systemMetadataRepository.set(SystemConfigKey.TASKS, taskConfig)

        this.applyTaskConfig(taskName, updated)

        const isActive = this.schedulerRegistry.doesExist('cron', taskName)
            ? this.schedulerRegistry.getCronJob(taskName).isActive
            : false

        return {
            name: taskName,
            enabled: updated.enabled,
            runOnStartup: updated.runOnStartup,
            cronExpression: updated.cronExpression,
            isActive,
        }
    }

    private applyTaskConfig(taskName: ScheduledTasks, config: TaskConfig): void {
        if (!this.schedulerRegistry.doesExist('cron', taskName)) {
            this.logger.warn(`Cannot update task '${taskName}': job is not registered`)
            return
        }

        const job = this.schedulerRegistry.getCronJob(taskName)

        if (!config.enabled) {
            if (job.isActive) {
                job.stop()
                this.logger.log(`Disabled task '${taskName}'`)
            }
            return
        }

        job.setTime(new CronTime(config.cronExpression, 'UTC'))

        if (!job.isActive) {
            job.start()
        }

        this.logger.log(`Updated task '${taskName}' — cron='${config.cronExpression}', enabled=${config.enabled}`)
    }

    // #endregion Task Configuration

    // #region Job Management

    start(taskName: ScheduledTasks): void {
        if (!this.schedulerRegistry.doesExist('cron', taskName)) {
            this.logger.warn(`Cannot start cron job '${taskName}': job is not registered`)
            return
        }
        const task = this.schedulerRegistry.getCronJob(taskName)

        if (!task.isActive) {
            task.start()
            this.logger.log(`Started cron job '${taskName}'`)
        }
    }

    stop(taskName: ScheduledTasks): void {
        if (!this.schedulerRegistry.doesExist('cron', taskName)) {
            this.logger.warn(`Cannot stop cron job '${taskName}': job is not registered`)
            return
        }

        const task = this.schedulerRegistry.getCronJob(taskName)

        if (task.isActive) {
            task.stop()
            this.logger.log(`Stopped cron job '${taskName}'`)
        }
    }

    create(taskName: ScheduledTasks, cronExpression: string, handler: TaskHandler): CronJob | undefined {
        if (this.schedulerRegistry.doesExist('cron', taskName)) {
            this.logger.warn(`Cron job '${taskName}' is already registered — skipping duplicate`)
            return undefined
        }

        const job = CronJob.from({
            cronTime: cronExpression,
            onTick: async () => {
                await handler()
            },
            errorHandler: (error) => {
                this.logger.error(`Execution of task '${taskName}' failed`, {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                })
            },
            start: true,
            waitForCompletion: true,
            timeZone: 'UTC',
        })
        this.schedulerRegistry.addCronJob(taskName, job)

        this.logger.log(`Registered cron job '${taskName}' with expression '${cronExpression}'`)

        return job
    }

    // #endregion Job Management

    // #region Discovery

    private discoverTasks(): DiscoveredTask[] {
        const tasks: DiscoveredTask[] = []

        for (const wrapper of this.discoveryService.getProviders()) {
            if (!(wrapper.instance instanceof TaskService)) continue

            // Widen the narrowed TaskService type so methods can be looked up by name.
            const instance = wrapper.instance as unknown as Record<string, (...args: unknown[]) => unknown>
            const providerName = wrapper.instance.constructor.name
            const prototype = Object.getPrototypeOf(instance)

            for (const methodName of this.metadataScanner.getAllMethodNames(prototype)) {
                const method = instance[methodName]

                if (typeof method !== 'function') {
                    continue
                }

                const taskName = this.reflector.get<ScheduledTasks>(TASK, method)

                if (!taskName) {
                    continue
                }

                if (method.length !== 0) {
                    this.logger.warn(
                        `Task '${taskName}' on '${providerName}.${methodName}' expects ` +
                            `${method.length} argument(s) and will be skipped — task handlers must accept no arguments`
                    )
                    continue
                }

                tasks.push({
                    handler: (method as TaskHandler).bind(instance),
                    name: taskName,
                })
            }
        }

        return tasks
    }

    // #endregion Discovery
}
