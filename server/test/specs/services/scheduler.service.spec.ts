import { Test, TestingModule } from '@nestjs/testing'
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core'
import { SchedulerRegistry } from '@nestjs/schedule'
import { SchedulerService } from '@/api/services/scheduler.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { TASK } from '@/decorators'
import { TaskMetadata } from '@/types/models/tasks'
import { ScheduledTasks } from '@/types/enums'
import { CronJob } from 'cron'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { TaskService } from '@/api/services/tasks.service'

// Replace TaskService with a bare class so fake providers can extend it (satisfying the
// scheduler's instanceof filter) without pulling in the real decorated handlers or
// constructor dependencies.
jest.mock('@/api/services/tasks.service', () => ({
    TaskService: class TaskService {},
}))

function createTaskMetadata(overrides: Partial<TaskMetadata> = {}): TaskMetadata {
    return {
        name: ScheduledTasks.PROCESS_SUBSCRIPTIONS,
        cronExpression: '0 0 * * * *',
        ...overrides,
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
            super(undefined as never, undefined as never)
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

    beforeEach(async () => {
        loggerMock = createLoggerMock()
        schedulerRegistryMock = createSchedulerRegistryMock()
        discoveryServiceMock = createDiscoveryServiceMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                { provide: LoggingProvider, useValue: loggerMock },
                { provide: SchedulerRegistry, useValue: schedulerRegistryMock },
                { provide: DiscoveryService, useValue: discoveryServiceMock },
                { provide: Reflector, useValue: new Reflector() },
                { provide: MetadataScanner, useValue: new MetadataScanner() },
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
            Reflect.defineMetadata(TASK, createTaskMetadata(), handler)
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
            Reflect.defineMetadata(TASK, createTaskMetadata(), handler)

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
            Reflect.defineMetadata(TASK, createTaskMetadata(), handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled()
        })

        it('does not run handler at startup when runOnStartup is not set', async () => {
            const handler = jest.fn()
            Reflect.defineMetadata(TASK, createTaskMetadata(), handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])

            await service.startAll()

            expect(handler).not.toHaveBeenCalled()
        })

        it('does not register a task when enabled is false', async () => {
            const handler = jest.fn()
            Reflect.defineMetadata(TASK, createTaskMetadata({ enabled: false, runOnStartup: true }), handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled()
            expect(handler).not.toHaveBeenCalled()
        })

        it('registers a task when enabled is not set', async () => {
            const handler = jest.fn()
            Reflect.defineMetadata(TASK, createTaskMetadata(), handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledTimes(1)
        })

        it('runs handler immediately at startup when runOnStartup is true', async () => {
            const handler = jest.fn().mockResolvedValue(true)
            Reflect.defineMetadata(TASK, createTaskMetadata({ runOnStartup: true }), handler)
            discoveryServiceMock.getProviders.mockReturnValue([createProviderWrapper({ handler })])

            await service.startAll()

            expect(handler).toHaveBeenCalledTimes(1)
        })

        it('binds the handler to its provider instance', async () => {
            let capturedThis: unknown
            const handler = jest.fn(function (this: unknown) {
                capturedThis = this
            })
            Reflect.defineMetadata(TASK, createTaskMetadata({ runOnStartup: true }), handler)
            const wrapper = createProviderWrapper({ handler })
            discoveryServiceMock.getProviders.mockReturnValue([wrapper])

            await service.startAll()

            expect(capturedThis).toBe(wrapper.instance)
        })

        it('logs and continues when a startup execution fails', async () => {
            const failingHandler = jest.fn().mockRejectedValue(new Error('startup boom'))
            Reflect.defineMetadata(
                TASK,
                createTaskMetadata({ name: ScheduledTasks.SYNC_CLIENT_ACCOUNTS, runOnStartup: true }),
                failingHandler
            )

            const succeedingHandler = jest.fn().mockResolvedValue(true)
            Reflect.defineMetadata(
                TASK,
                createTaskMetadata({ name: ScheduledTasks.PROCESS_SUBSCRIPTIONS, runOnStartup: true }),
                succeedingHandler
            )

            discoveryServiceMock.getProviders.mockReturnValue([
                createProviderWrapper({ failingHandler }),
                createProviderWrapper({ succeedingHandler }),
            ])

            await expect(service.startAll()).resolves.toBeUndefined()

            expect(succeedingHandler).toHaveBeenCalledTimes(1)
        })

        it('registers multiple tasks discovered across providers', async () => {
            const handlerA = jest.fn()
            Reflect.defineMetadata(TASK, createTaskMetadata({ name: ScheduledTasks.PROCESS_SUBSCRIPTIONS }), handlerA)

            const handlerB = jest.fn()
            Reflect.defineMetadata(TASK, createTaskMetadata({ name: ScheduledTasks.SYNC_CLIENT_ACCOUNTS }), handlerB)

            discoveryServiceMock.getProviders.mockReturnValue([
                createProviderWrapper({ handlerA }),
                createProviderWrapper({ handlerB }),
            ])

            await service.startAll()

            expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledTimes(2)
        })
    })

    // #endregion startAll / discovery

    // #region create

    describe('create', () => {
        it('registers the cron job', () => {
            const metadata = createTaskMetadata()

            service.create(metadata, jest.fn())

            expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledWith(metadata.name, expect.anything())
        })

        it('skips registration when a job with the same name already exists', () => {
            schedulerRegistryMock.doesExist.mockReturnValue(true)

            service.create(createTaskMetadata(), jest.fn())

            expect(schedulerRegistryMock.addCronJob).not.toHaveBeenCalled()
        })

        it('invokes the handler when the cron job ticks', async () => {
            const handler = jest.fn().mockResolvedValue(true)

            const job = service.create(createTaskMetadata(), handler)

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

            service.start(createTaskMetadata())

            expect(job.start).toHaveBeenCalledTimes(1)
        })

        it('does not start an already active job', () => {
            const job = createCronJobMock(true)
            schedulerRegistryMock.doesExist.mockReturnValue(true)
            schedulerRegistryMock.getCronJob.mockReturnValue(job)

            service.start(createTaskMetadata())

            expect(job.start).not.toHaveBeenCalled()
        })

        it('warns when the job is not registered', () => {
            schedulerRegistryMock.doesExist.mockReturnValue(false)

            service.start(createTaskMetadata())

            expect(schedulerRegistryMock.getCronJob).not.toHaveBeenCalled()
        })
    })

    describe('stop', () => {
        it('stops an active job', () => {
            const job = createCronJobMock(true)
            schedulerRegistryMock.doesExist.mockReturnValue(true)
            schedulerRegistryMock.getCronJob.mockReturnValue(job)

            service.stop(createTaskMetadata())

            expect(job.stop).toHaveBeenCalledTimes(1)
        })

        it('does not stop an inactive job', () => {
            const job = createCronJobMock(false)
            schedulerRegistryMock.doesExist.mockReturnValue(true)
            schedulerRegistryMock.getCronJob.mockReturnValue(job)

            service.stop(createTaskMetadata())

            expect(job.stop).not.toHaveBeenCalled()
        })

        it('warns when the job is not registered', () => {
            schedulerRegistryMock.doesExist.mockReturnValue(false)

            service.stop(createTaskMetadata())

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
