import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { IOAuthProviderRepository } from '@/data/repositories/IOAuthProviderRepository'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { OAuthProviderModel, OAuthProviderName } from '@/types/models/oauthProvider'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Injectable()
export class OAuthProviderManagementService {
    constructor(
        @Inject(IOAuthProviderRepository) private readonly oauthProviderRepository: IOAuthProviderRepository,
        @Inject(ISessionRepository) private readonly sessionRepository: ISessionRepository,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
    }

    async list(take: number = 50, skip: number = 0): Promise<PaginatedResponseDto<OAuthProviderModel>> {
        const [providers, total] = await Promise.all([
            this.oauthProviderRepository.findMany({}, take, skip),
            this.oauthProviderRepository.count({}),
        ])
        return new PaginatedResponseDto(providers, total, skip)
    }

    async listEnabledNames(): Promise<OAuthProviderName[]> {
        const providers = await this.oauthProviderRepository.findMany({ enabled: true })
        return providers.map((p) => p.name)
    }

    async enable(name: OAuthProviderName): Promise<OAuthProviderModel> {
        const provider = await this.oauthProviderRepository.setEnabled(name, true)
        if (!provider) throw new NotFoundException(`OAuth provider '${name}' not found`)
        this.logger.log(`OAuth provider '${name}' enabled`)
        return provider
    }

    async disable(name: OAuthProviderName): Promise<OAuthProviderModel> {
        const provider = await this.oauthProviderRepository.setEnabled(name, false)
        if (!provider) throw new NotFoundException(`OAuth provider '${name}' not found`)

        await this.sessionRepository.deleteByProviderId(provider.id)
        this.logger.warn(`OAuth provider '${name}' disabled and all of its sessions invalidated`)

        return provider
    }

    async updateEnabledById(id: number, enabled: boolean): Promise<OAuthProviderModel> {
        const provider = await this.oauthProviderRepository.findById(id)
        if (!provider) throw new NotFoundException(`OAuth provider with id '${id}' not found`)

        return enabled ? this.enable(provider.name) : this.disable(provider.name)
    }
}
