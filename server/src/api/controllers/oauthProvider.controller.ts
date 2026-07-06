import { Body, Controller, Get, Inject, Put, Query } from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { OAuthProviderManagementService } from '@/api/services/oauthProviderManagement.service'
import { OAuthProviderActionRequestDto, OAuthProviderResponseDto } from '@/types/dtos/oauthProviderDto'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { routes } from '@/types/dtos/routes'

@ApiTags('OAuth Providers')
@Controller(routes.oauthProviders.basePath)
export class OAuthProviderController {
    constructor(
        @Inject(OAuthProviderManagementService)
        private readonly oauthProviderManagementService: OAuthProviderManagementService
    ) {}

    @Get(routes.oauthProviders.subPath.list)
    @AdminRoute()
    @ApiOperation({ summary: 'List all OAuth providers (admin only)' })
    @ApiOkResponse({ type: [OAuthProviderResponseDto] })
    async list(@Query() pagination: PaginationRequestDto): Promise<OAuthProviderResponseDto[]> {
        const providers = await this.oauthProviderManagementService.list(pagination.take, pagination.skip)
        return providers.map((p) => ({ id: p.id, name: p.name, enabled: p.enabled }))
    }

    @Put(routes.oauthProviders.subPath.enable)
    @AdminRoute()
    @ApiOperation({ summary: 'Enable an OAuth provider (admin only)' })
    @ApiBody({ type: OAuthProviderActionRequestDto })
    @ApiOkResponse({ type: OAuthProviderResponseDto })
    async enable(@Body() request: OAuthProviderActionRequestDto): Promise<OAuthProviderResponseDto> {
        const provider = await this.oauthProviderManagementService.enable(request.name)
        return { id: provider.id, name: provider.name, enabled: provider.enabled }
    }

    @Put(routes.oauthProviders.subPath.disable)
    @AdminRoute()
    @ApiOperation({ summary: 'Disable an OAuth provider (admin only)' })
    @ApiBody({ type: OAuthProviderActionRequestDto })
    @ApiOkResponse({ type: OAuthProviderResponseDto })
    async disable(@Body() request: OAuthProviderActionRequestDto): Promise<OAuthProviderResponseDto> {
        const provider = await this.oauthProviderManagementService.disable(request.name)
        return { id: provider.id, name: provider.name, enabled: provider.enabled }
    }
}
