import { Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Patch, Query } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { SessionService } from '@/api/services/session.service'
import { SessionResponseDto, SessionParamsDto, SessionConfigResponseDto, UpdateSessionConfigDto } from '@/types/dtos/sessionDto'
import { PaginatedResponseDto, PaginationRequestDto, ApiPaginatedResponse } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('Sessions')
@Controller(routes.sessions.basePath)
export class SessionController {
    constructor(@Inject(SessionService) private readonly sessionService: SessionService) {}

    @Get(routes.sessions.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List active sessions (admin only)' })
    @ApiQuery({ name: 'take', type: Number, required: false })
    @ApiQuery({ name: 'skip', type: Number, required: false })
    @ApiPaginatedResponse(SessionResponseDto)
    async list(@Query() query: PaginationRequestDto): Promise<PaginatedResponseDto<SessionResponseDto>> {
        return this.sessionService.list(query.take, query.skip)
    }

    @Get(routes.sessions.subPath.config)
    @AdminRoute()
    @ApiOperation({ summary: 'Get session configuration (admin only)' })
    @ApiOkResponse({ type: SessionConfigResponseDto })
    async getConfig(): Promise<SessionConfigResponseDto> {
        return this.sessionService.getConfig()
    }

    @Patch(routes.sessions.subPath.config)
    @AdminRoute()
    @ApiOperation({ summary: 'Update session configuration (admin only)' })
    @ApiBody({ type: UpdateSessionConfigDto })
    @ApiOkResponse({ type: SessionConfigResponseDto })
    async updateConfig(@Body() dto: UpdateSessionConfigDto): Promise<SessionConfigResponseDto> {
        return this.sessionService.updateConfig(dto)
    }

    @Delete(routes.sessions.subPath.revoke)
    @AdminRoute()
    @HttpCode(204)
    @ApiOperation({ summary: 'Revoke a session (admin only)' })
    @ApiParam({ name: 'id', type: String })
    @ApiOkResponse({ description: 'Session revoked' })
    async revoke(@Param() params: SessionParamsDto): Promise<void> {
        const session = await this.sessionService.findById(params.id)
        if (!session) {
            throw new NotFoundException('Session not found')
        }
        await this.sessionService.revoke(params.id)
    }
}
