import { Test, TestingModule } from '@nestjs/testing'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { SchedulerRegistry } from '@nestjs/schedule'
import { SchedulerService } from '@/api/services/scheduler.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { TASK } from '@/decorators'
import { ScheduledTasks } from '@/types/enums'
import { CronJob } from 'cron'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { TaskService } from '@/api/services/tasks.service'
import { ISystemMetadataRepository } from '@/data/repositories/ISystemMetadataRepository'
import { TasksSystemConfig } from '@/types/models/SystemConfig'

// Replace TaskService with a bare class so fake providers can extend it (satisfying the
// scheduler's instanceof filter) without pulling in the real decorated handlers or
// constructor dependencies.
jest.mock('@/api/services/tasks.service', () => ({
    TaskService: class TaskService {},
}))

const defaultTaskConfig: TasksSystemConfig = {
    [ScheduledTasks.PROCESS_SUBSCRIPTIONS]: { enabled: true, runOnStartup: false, cronExpression: '0 0 * * * *' },
    [ScheduledTasks.SYNC_CLIENT_ACCOUNTS]: { enabled: true, runOnStartup: false, cronExpression: '0 0 */12 * * *' },
    [ScheduledTasks.CLEANUP_STALE_LOCAL_ACCOUNTS]: {
        enabled: true,
        runOnStartup: false,
        cronExpression: '0 0 */12 * * *',
    },
    [ScheduledTasks.CLEANUP_PENDING_USERS]: {
        enabled: true,
        runOnStartup: true,
        cronExpression: '*/2 * * * *',
    },
}

function createSystemMetadataRepositoryMock(overrides: Partial<TasksSystemConfig> = {}) {
    const config = { ...defaultTaskConfig, ...overrides }
    return {
        get: jest.fn().mockResolvedValue(config),
        set: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(true),
        syncDefaults: jest.fn().mockResolvedValue([]),
    }
}

function createCronJobMock(isActive = false) {
    return {
        isActive,
        start: jest.fn(),
        stop: jest.fn(),
    }
}

function createSchedulerRegistryMock() {
    const jobs: CronJob[] = []

    return {
        jobs,
        doesExist: jest.fn().mockReturnValue(false),
        getCronJob: jest.fn(),
        addCronJob: jest.fn((_name: string, job: CronJob) => {
            jobs.push(job)
        }),
    }
}

function createDiscoveryServiceMock() {
    return {
        getProviders: jest.fn().mockReturnValue([]),
    }
}

/**
 * Builds a fake provider wrapper whose instance has the given methods.
 * Methods are defined on a prototype so MetadataScanner can discover them.
 * Extends the (mocked) TaskService so the instance passes the scheduler's discovery filter.
 */
function createProviderWrapper(methods: Record<string, (...args: never[]) => unknown>) {
    class FakeProvider extends TaskService {
        constructor() {
            // The mocked TaskService base class takes no constructor arguments at runtime.
            super(undefined as never, undefined as never, undefined as never)
        }
    }

    for (const [name, fn] of Object.entries(methods)) {
        Object.defineProperty(FakeProvider.prototype, name, {
            value: fn,
            writable: true,
            configurable: true,
        })
    }

    return { instance: new FakeProvider() }
}

describe('SchedulerService', () => {
    let service: SchedulerService
    let loggerMock: ReturnType<typeof createLoggerMock>
    let schedulerRegistryMock: ReturnType<typeof createSchedulerRegistryMock>
    let discoveryServiceMock: ReturnType<typeof createDiscoveryServiceMock>
    let systemMetadataRepositoryMock: ReturnType<typeof createSystemMetadataRepositoryMock>

    beforeEach(async () => {
        loggerMock = createLoggerMock()
        schedulerRegistryMock = createSchedulerRegistryMock()
        discoveryServiceMock = createDiscoveryServiceMock()
        systemMetadataRepositoryMock = createSystemMetadataRepositoryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                { provide: LoggingProvider, useValue: loggerMock },
                { provide: SchedulerRegistry, useValue: schedulerRegistryMock },
                { provide: DiscoveryService, useValue: discoveryServiceMock },
                { provide: Reflector, useValue: new Reflector() },
                { provide: MetadataScanner, useValue: new MetadataScanner() },
                { provide: ISystemMetadataRepository, useValue: systemMetadataRepositoryMock },
            ],
        }).compile()

        service = module.get<SchedulerService>(SchedulerService)
    })

    afterEach(async () => {
        // Stop every real CronJob created during the test so no timers keep the worker alive.
        await Promise.all(schedulerRegistryMock.jobs.map((job) => job.stop()))
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    // #region startAll / discovery

    describe('startAll', () => {
        it('registers a cron job for each decorated method', async () => {
            const handler = jest.fn()
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledTimes(1)
            expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledWith(
                ScheduledTasks.PROCESS_SUBSCRIPTIONS,
                expect.anything()
            )
        })

        it('ignores methods without task metadata', async () => {
            const plainMethod = jest.fn()
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ plainMethod })])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled()
        })

        it('ignores providers without an instance', async () => {
            discoveryServiceMock.getProviders.mockReturnValue([{ instance: null }, { instance: undefined }])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled()
        })

        it('ignores decorated methods on providers that are not the task service', async () => {
            const handler = jest.fn()
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, handler)

            class NotTaskService {}
            Object.defineProperty(NotTaskService.prototype, 'handler', {
                value: handler,
                writable: true,
                configurable: true,
            })
            discoveryServiceMock.getProviders.mockReturnValue([{ instance: new NotTaskService() }])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled()
        })

        it('skips handlers that declare required arguments', async () => {
            const handler = (_arg: string) => undefined
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled()
        })

        it('does not run handler at startup when runOnStartup is false in config', async () => {
            const handler = jest.fn()
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])

            await service.startAll()

            expect(handler).not.toHaveBeenCalled()
        })

        it('does not register a task when enabled is false in config', async () => {
            const handler = jest.fn()
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])
            systemMetadataRepositoryMock.get.mockResolvedValue({
                ...defaultTaskConfig,
                [ScheduledTasks.PROCESS_SUBSCRIPTIONS]: {
                    enabled: false,
                    runOnStartup: false,
                    cronExpression: '0 0 * * * *',
                },
            })

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled()
            expect(handler).not.toHaveBeenCalled()
        })

        it('registers a task when enabled is true in config', async () => {
            const handler = jest.fn()
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledTimes(1)
        })

        it('runs handler immediately at startup when runOnStartup is true in config', async () => {
            const handler = jest.fn().mockResolvedValue(true)
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])
            systemMetadataRepositoryMock.get.mockResolvedValue({
                ...defaultTaskConfig,
                [ScheduledTasks.PROCESS_SUBSCRIPTIONS]: {
                    enabled: true,
                    runOnStartup: true,
                    cronExpression: '0 0 * * * *',
                },
            })

            await service.startAll()

            expect(handler).toHaveBeenCalledTimes(1)
        })

        it('binds the handler to its provider instance', async () => {
            let capturedThis: unknown
            const handler = jest.fn(function (this: unknown) {
                capturedThis = this // eslint-disable-line @typescript-eslint/no-this-alias
            })
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, handler)
            const wrapper = createProviderWrapper({ handler })
            discoveryServiceMock.getProviders.mockReturnValue([wrapper])
            systemMetadataRepositoryMock.get.mockResolvedValue({
                ...defaultTaskConfig,
                [ScheduledTasks.PROCESS_SUBSCRIPTIONS]: {
                    enabled: true,
                    runOnStartup: true,
                    cronExpression: '0 0 * * * *',
                },
            })

            await service.startAll()

            expect(capturedThis).toBe(wrapper.instance)
        })

        it('logs and continues when a startup execution fails', async () => {
            const failingHandler = jest.fn().mockRejectedValue(new Error('startup boom'))
            Reflect.defineMetadata(TASK, ScheduledTasks.SYNC_CLIENT_ACCOUNTS, failingHandler)

            const succeedingHandler = jest.fn().mockResolvedValue(true)
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, succeedingHandler)

            discoveryServiceMock.getProviders.mockReturnValue([
                createProviderWrapper({ failingHandler }),
                createProviderWrapper({ succeedingHandler }),
            ])

            systemMetadataRepositoryMock.get.mockResolvedValue({
                ...defaultTaskConfig,
                [ScheduledTasks.PROCESS_SUBSCRIPTIONS]: {
                    enabled: true,
                    runOnStartup: true,
                    cronExpression: '0 0 * * * *',
                },
                [ScheduledTasks.SYNC_CLIENT_ACCOUNTS]: {
                    enabled: true,
                    runOnStartup: true,
                    cronExpression: '0 0 */12 * * *',
                },
            })

            await expect(service.startAll()).resolves.toBeUndefined()

            expect(succeedingHandler).toHaveBeenCalledTimes(1)
        })

        it('registers multiple tasks discovered across providers', async () => {
            const handlerA = jest.fn()
            Reflect.defineMetadata(TASK, ScheduledTasks.PROCESS_SUBSCRIPTIONS, handlerA)

            const handlerB = jest.fn()
            Reflect.defineMetadata(TASK, ScheduledTasks.SYNC_CLIENT_ACCOUNTS, handlerB)

            discoveryServiceMock.getProviders.mockReturnValue([
                createProviderWrapper({ handlerA }),
                createProviderWrapper({ handlerB }),
            ])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledTimes(2)
        })

        it('throws when a discovered task has no config in defaults or database', async () => {
            const handler = jest.fn()
            Reflect.defineMetadata(TASK, 'unknown_task' as ScheduledTasks, handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])
            systemMetadataRepositoryMock.get.mockResolvedValue(defaultTaskConfig)

            await expect(service.startAll()).rejects.toThrow(
                `Discovered task 'unknown_task' has no configuration in defaults or database`
            )
        })
    })

    // #endregion startAll / discovery

    // #region create

    describe('create', () => {
        it('registers the cron job', () => {
            service.create(ScheduledTasks.PROCESS_SUBSCRIPTIONS, '0 0 * * * *', jest.fn())

            expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledWith(
                ScheduledTasks.PROCESS_SUBSCRIPTIONS,
                expect.anything()
            )
        })

        it('skips registration when a job with the same name already exists', () => {
            schedulerRegistryMock.doesExist.mockReturnValue(true)

            service.create(ScheduledTasks.PROCESS_SUBSCRIPTIONS, '0 0 * * * *', jest.fn())

            expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled()
        })

        it('invokes the handler when the cron job ticks', async () => {
            const handler = jest.fn().mockResolvedValue(true)

            const job = service.create(ScheduledTasks.PROCESS_SUBSCRIPTIONS, '0 0 * * * *', handler)

            await job?.fireOnTick()

            expect(handler).toHaveBeenCalledTimes(1)
        })
    })

    // #endregion create

    // #region start / stop

    describe('start', () => {
        it('starts an inactive job', () => {
            const job = createCronJobMock(false)
            schedulerRegistryMock.doesExist.mockReturnValue(true)
            schedulerRegistryMock.getCronJob.mockReturnValue(job)

            service.start(ScheduledTasks.PROCESS_SUBSCRIPTIONS)

            expect(job.start).toHaveBeenCalledTimes(1)
        })

        it('does not start an already active job', () => {
            const job = createCronJobMock(true)
            schedulerRegistryMock.doesExist.mockReturnValue(true)
            schedulerRegistryMock.getCronJob.mockReturnValue(job)

            service.start(ScheduledTasks.PROCESS_SUBSCRIPTIONS)

            expect(job.start).not.toHaveBeenCalled()
        })

        it('warns when the job is not registered', () => {
            schedulerRegistryMock.doesExist.mockReturnValue(false)

            service.start(ScheduledTasks.PROCESS_SUBSCRIPTIONS)

            expect(schedulerRegistryMock.getCronJob).not.toHaveBeenCalled()
        })
    })

    describe('stop', () => {
        it('stops an active job', () => {
            const job = createCronJobMock(true)
            schedulerRegistryMock.doesExist.mockReturnValue(true)
            schedulerRegistryMock.getCronJob.mockReturnValue(job)

            service.stop(ScheduledTasks.PROCESS_SUBSCRIPTIONS)

            expect(job.stop).toHaveBeenCalledTimes(1)
        })

        it('does not stop an inactive job', () => {
            const job = createCronJobMock(false)
            schedulerRegistryMock.doesExist.mockReturnValue(true)
            schedulerRegistryMock.getCronJob.mockReturnValue(job)

            service.stop(ScheduledTasks.PROCESS_SUBSCRIPTIONS)

            expect(job.stop).not.toHaveBeenCalled()
        })

        it('warns when the job is not registered', () => {
            schedulerRegistryMock.doesExist.mockReturnValue(false)

            service.stop(ScheduledTasks.PROCESS_SUBSCRIPTIONS)

            expect(schedulerRegistryMock.getCronJob).not.toHaveBeenCalled()
        })
    })

    // #endregion start / stop

    // #region onApplicationBootstrap

    describe('onApplicationBootstrap', () => {
        it('delegates to startAll', async () => {
            const startAllSpy = jest.spyOn(service, 'startAll').mockResolvedValue()

            await service.onApplicationBootstrap()

            expect(startAllSpy).toHaveBeenCalledTimes(1)
        })
    })

    // #endregion onApplicationBootstrap
})
