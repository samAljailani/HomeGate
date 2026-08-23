import { Test, TestingModule } from '@nestjs/testing'
import { TaskController } from '@/api/controllers/task.controller'
import { SchedulerService } from '@/api/services/scheduler.service'
import { ScheduledTasks } from '@/types/enums'

function createSchedulerServiceMock(): jest.Mocked<
    Pick<SchedulerService, 'getTaskConfigs' | 'getTaskConfig' | 'updateTask' | 'start' | 'stop' | 'runNow'>
> {
    return {
        getTaskConfigs: jest.fn(),
        getTaskConfig: jest.fn(),
        updateTask: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        runNow: jest.fn(),
    }
}

describe('TaskController', () => {
    let controller: TaskController
    let schedulerServiceMock: ReturnType<typeof createSchedulerServiceMock>

    beforeEach(async () => {
        schedulerServiceMock = createSchedulerServiceMock()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TaskController],
            providers: [{ provide: SchedulerService, useValue: schedulerServiceMock }],
        }).compile()

        controller = module.get<TaskController>(TaskController)
    })

    it('starts a valid task and returns its current config', async () => {
        const task = ScheduledTasks.PROCESS_SUBSCRIPTIONS
        const config = {
            name: task,
            enabled: true,
            runOnStartup: false,
            cronExpression: '0 0 * * * *',
            isActive: true,
            lastAttemptedRunAt: null,
            lastSuccessfulRunAt: null,
            lastRunDurationMs: null,
        }
        schedulerServiceMock.getTaskConfig.mockResolvedValue(config)

        const result = await controller.startTask({ name: task })

        expect(schedulerServiceMock.start).toHaveBeenCalledWith(task)
        expect(schedulerServiceMock.getTaskConfig).toHaveBeenCalledWith(task)
        expect(result).toEqual(config)
    })

    it('stops a valid task and returns its current config', async () => {
        const task = ScheduledTasks.PROCESS_SUBSCRIPTIONS
        const config = {
            name: task,
            enabled: true,
            runOnStartup: false,
            cronExpression: '0 0 * * * *',
            isActive: false,
            lastAttemptedRunAt: null,
            lastSuccessfulRunAt: null,
            lastRunDurationMs: null,
        }
        schedulerServiceMock.getTaskConfig.mockResolvedValue(config)

        const result = await controller.stopTask({ name: task })

        expect(schedulerServiceMock.stop).toHaveBeenCalledWith(task)
        expect(schedulerServiceMock.getTaskConfig).toHaveBeenCalledWith(task)
        expect(result).toEqual(config)
    })

    it('runs a valid task immediately and returns its current config', async () => {
        const task = ScheduledTasks.PROCESS_SUBSCRIPTIONS
        const config = {
            name: task,
            enabled: false,
            runOnStartup: false,
            cronExpression: '0 0 * * * *',
            isActive: false,
            lastAttemptedRunAt: new Date(),
            lastSuccessfulRunAt: new Date(),
            lastRunDurationMs: 42,
        }
        schedulerServiceMock.runNow.mockResolvedValue(undefined)
        schedulerServiceMock.getTaskConfig.mockResolvedValue(config)

        const result = await controller.runTask({ name: task })

        expect(schedulerServiceMock.runNow).toHaveBeenCalledWith(task)
        expect(schedulerServiceMock.getTaskConfig).toHaveBeenCalledWith(task)
        expect(result).toEqual(config)
    })
})
