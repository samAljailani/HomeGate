import { Body, Controller, Get, Inject, NotFoundException, Param, Patch, Post } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { routes } from '@/types/dtos/routes'
import { SchedulerService } from '@/api/services/scheduler.service'
import { ScheduledTasks } from '@/types/enums'
import { TaskConfigResponseDto, TaskParamsDto, UpdateTaskConfigDto } from '@/types/dtos/taskDto'

@ApiTags('Tasks')
@Controller(routes.tasks.basePath)
export class TaskController {
    constructor(@Inject(SchedulerService) private readonly schedulerService: SchedulerService) {}

    @Get(routes.tasks.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List all task configurations with current status' })
    @ApiOkResponse({ type: [TaskConfigResponseDto] })
    async listTasks(): Promise<TaskConfigResponseDto[]> {
        return this.schedulerService.getTaskConfigs()
    }

    @Patch(routes.tasks.subPath.update)
    @AdminRoute()
    @ApiOperation({ summary: 'Update task configuration (hot-reloads immediately)' })
    @ApiParam({ name: 'name', type: String })
    @ApiBody({ type: UpdateTaskConfigDto })
    @ApiOkResponse({ type: TaskConfigResponseDto })
    async updateTask(@Param() params: TaskParamsDto, @Body() dto: UpdateTaskConfigDto): Promise<TaskConfigResponseDto> {
        return this.schedulerService.updateTask(this.getTaskName(params.name), dto)
    }

    @Post(routes.tasks.subPath.start)
    @AdminRoute()
    @ApiOperation({ summary: 'Start a scheduled task' })
    @ApiParam({ name: 'name', type: String })
    @ApiOkResponse({ type: TaskConfigResponseDto })
    async startTask(@Param() params: TaskParamsDto): Promise<TaskConfigResponseDto> {
        const taskName = this.getTaskName(params.name)
        this.schedulerService.start(taskName)
        return this.schedulerService.getTaskConfig(taskName)
    }

    @Post(routes.tasks.subPath.stop)
    @AdminRoute()
    @ApiOperation({ summary: 'Stop a scheduled task' })
    @ApiParam({ name: 'name', type: String })
    @ApiOkResponse({ type: TaskConfigResponseDto })
    async stopTask(@Param() params: TaskParamsDto): Promise<TaskConfigResponseDto> {
        const taskName = this.getTaskName(params.name)
        this.schedulerService.stop(taskName)
        return this.schedulerService.getTaskConfig(taskName)
    }

    @Post(routes.tasks.subPath.run)
    @AdminRoute()
    @ApiOperation({ summary: 'Run a task immediately, regardless of its enabled state or schedule' })
    @ApiParam({ name: 'name', type: String })
    @ApiOkResponse({ type: TaskConfigResponseDto })
    async runTask(@Param() params: TaskParamsDto): Promise<TaskConfigResponseDto> {
        const taskName = this.getTaskName(params.name)
        await this.schedulerService.runNow(taskName)
        return this.schedulerService.getTaskConfig(taskName)
    }

    private getTaskName(name: string): ScheduledTasks {
        if (!Object.values(ScheduledTasks).includes(name as ScheduledTasks)) {
            throw new NotFoundException(`Task '${name}' does not exist`)
        }

        return name as ScheduledTasks
    }
}
