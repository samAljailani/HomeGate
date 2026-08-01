import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Inject,
    Param,
    Patch,
    Query,
} from '@nestjs/common'
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { AdminRoute } from '@/decorators'
import { OAuthProviderManagementService } from '@/api/services/oauthProviderManagement.service'
import {
    OAuthProviderParamsDto,
    OAuthProviderPatchRequestDto,
    OAuthProviderResponseDto,
} from '@/types/dtos/oauthProviderDto'
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

    @Patch(routes.oauthProviders.subPath.update)
    @AdminRoute()
    @ApiOperation({ summary: 'Update OAuth provider state — enabled (admin only)' })
    @ApiParam({ name: 'id', type: Number })
    @ApiBody({ type: OAuthProviderPatchRequestDto })
    @ApiOkResponse({ type: OAuthProviderResponseDto })
    async update(
        @Param() params: OAuthProviderParamsDto,
        @Body() request: OAuthProviderPatchRequestDto
    ): Promise<OAuthProviderResponseDto> {
        if (request.enabled === undefined) {
            throw new BadRequestException('No fields provided to update')
        }

        const provider = await this.oauthProviderManagementService.updateEnabledById(params.id, request.enabled)
        return { id: provider.id, name: provider.name, enabled: provider.enabled }
    }
}
