import { Body, Controller, Get, Inject, NotFoundException, Param, Patch } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
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
    @ApiOkResponse({ type: TaskConfigResponseDto })
    async updateTask(@Param() params: TaskParamsDto, @Body() dto: UpdateTaskConfigDto): Promise<TaskConfigResponseDto> {
        if (!Object.values(ScheduledTasks).includes(params.name as ScheduledTasks)) {
            throw new NotFoundException(`Task '${params.name}' does not exist`)
        }

        return this.schedulerService.updateTask(params.name as ScheduledTasks, dto)
    }
}
