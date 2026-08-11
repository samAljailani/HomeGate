import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { IOAuthProviderRepository } from '@/data/repositories/IOAuthProviderRepository'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { OAuthProviderModel, OAuthProviderName } from '@/types/models/oauthProvider'

@Injectable()
export class OAuthProviderManagementService {
    constructor(
        @Inject(IOAuthProviderRepository) private readonly oauthProviderRepository: IOAuthProviderRepository,
        @Inject(ISessionRepository) private readonly sessionRepository: ISessionRepository
    ) {}

    async list(take?: number, skip?: number): Promise<OAuthProviderModel[]> {
        return this.oauthProviderRepository.findMany({}, take, skip)
    }

    async enable(name: OAuthProviderName): Promise<OAuthProviderModel> {
        const provider = await this.oauthProviderRepository.setEnabled(name, true)
        if (!provider) throw new NotFoundException(`OAuth provider '${name}' not found`)
        return provider
    }

    async disable(name: OAuthProviderName): Promise<OAuthProviderModel> {
        const provider = await this.oauthProviderRepository.setEnabled(name, false)
        if (!provider) throw new NotFoundException(`OAuth provider '${name}' not found`)

        await this.sessionRepository.deleteByProviderId(provider.id)

        return provider
    }

    async updateEnabledById(id: number, enabled: boolean): Promise<OAuthProviderModel> {
        const provider = await this.oauthProviderRepository.findById(id)
        if (!provider) throw new NotFoundException(`OAuth provider with id '${id}' not found`)

        return enabled ? this.enable(provider.name) : this.disable(provider.name)
    }
}
