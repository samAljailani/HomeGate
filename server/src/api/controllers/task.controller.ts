import { BadRequestException, Body, Controller, Get, Inject, NotFoundException, Param, Put } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { routes } from '@/types/dtos/routes'
import { SchedulerService } from '@/api/services/scheduler.service'
import { ISystemMetadataRepository } from '@/data/repositories/ISystemMetadataRepository'
import { SystemConfigKey, TaskConfig } from '@/types/models/SystemConfig'
import { ScheduledTasks } from '@/types/enums'
import { TaskConfigResponseDto, UpdateTaskConfigDto } from '@/types/dtos/taskDto'
import { SchedulerRegistry } from '@nestjs/schedule'
import { validateCronExpression } from 'cron'

@ApiTags('Tasks')
@Controller(routes.tasks.basePath)
export class TaskController {
    constructor(
        @Inject(SchedulerService) private readonly schedulerService: SchedulerService,
        @Inject(ISystemMetadataRepository) private readonly systemMetadataRepository: ISystemMetadataRepository,
        @Inject(SchedulerRegistry) private readonly schedulerRegistry: SchedulerRegistry
    ) {}

    @Get(routes.tasks.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List all task configurations with current status' })
    @ApiOkResponse({ type: [TaskConfigResponseDto] })
    async listTasks(): Promise<TaskConfigResponseDto[]> {
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

    @Put(routes.tasks.subPath.update)
    @AdminRoute()
    @ApiOperation({ summary: 'Update task configuration (hot-reloads immediately)' })
    @ApiOkResponse({ type: TaskConfigResponseDto })
    async updateTask(
        @Param('name') name: string,
        @Body() dto: UpdateTaskConfigDto
    ): Promise<TaskConfigResponseDto> {
        if (!Object.values(ScheduledTasks).includes(name as ScheduledTasks)) {
            throw new NotFoundException(`Task '${name}' does not exist`)
        }

        const taskName = name as ScheduledTasks

        if (dto.cronExpression !== undefined) {
            const validation = validateCronExpression(dto.cronExpression)
            if (!validation.valid) {
                throw new BadRequestException(`Invalid cron expression: ${validation.error?.message ?? 'unknown error'}`)
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

        // Hot-reload: apply to running scheduler
        this.schedulerService.updateTaskConfig(taskName, updated)

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
}
