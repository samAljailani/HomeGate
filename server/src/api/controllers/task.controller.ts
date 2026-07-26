import { Body, Controller, Get, Inject, NotFoundException, Param, Put } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { routes } from '@/types/dtos/routes'
import { SchedulerService } from '@/api/services/scheduler.service'
import { ScheduledTasks } from '@/types/enums'
import { TaskConfigResponseDto, UpdateTaskConfigDto } from '@/types/dtos/taskDto'

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

        return this.schedulerService.updateTask(name as ScheduledTasks, dto)
    }
}
