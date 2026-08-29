import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { IServiceRepository } from '@/data/repositories'
import { ServiceModel } from '@/types/models/service'
import { ExternalAccountResponseDto, ServiceResponseDto } from '@/types/dtos/serviceDto'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { ApplicationUserModel } from '@/types/params/accountIntegration'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'

@Injectable()
export class ServiceManagementService {
    constructor(
        @Inject(IServiceRepository) private readonly serviceRepository: IServiceRepository,
        @Inject(AccountIntegrationRegistry) private readonly integrationRegistry: AccountIntegrationRegistry
    ) {}

    serviceModelToResponseDto(service: ServiceModel): ServiceResponseDto {
        const provider = this.integrationRegistry.get(service.integrationProvider)

        return {
            id: service.id,
            name: service.name,
            slug: service.slug,
            enabled: service.enabled,
            accountType: service.accountType,
            integrationProvider: service.integrationProvider,
            accountSourceServiceId: service.accountSourceServiceId,
            defaultAllowed: service.defaultAllowed,
            url: service.url,
            imageUrl: service.imageUrl,
            ...(provider && { requiredInputs: provider.requiredInputs }),
        }
    }

    applicationUserModelToResponseDto(user: ApplicationUserModel): ExternalAccountResponseDto {
        return {
            id: user.id,
            username: user.username,
            isActive: user.isActive,
            isAdmin: user.isAdmin,
        }
    }

    async listExternalAccounts(slug: string): Promise<ExternalAccountResponseDto[]> {
        const service = await this.serviceRepository.findBySlug(slug)

        if (!service) {
            throw new NotFoundException(`Service '${slug}' not found`)
        }

        const provider = this.integrationRegistry.get(service.integrationProvider)

        if (!provider) {
            throw new BadRequestException(`Service '${slug}' does not manage external accounts`)
        }

        const users = await provider.getAllUsers()
        return (users ?? []).map((u) => this.applicationUserModelToResponseDto(u))
    }

    async list(take: number = 50, skip: number = 0): Promise<PaginatedResponseDto<ServiceResponseDto>> {
        const [services, total] = await Promise.all([
            this.serviceRepository.findMany({}, take, skip),
            this.serviceRepository.count({}),
        ])
        return new PaginatedResponseDto(services.map((s) => this.serviceModelToResponseDto(s)), total, skip)
    }

    private async setEnabled(slug: string, enabled: boolean): Promise<ServiceResponseDto> {
        const service = await this.serviceRepository.findBySlug(slug)

        if (!service) {
            throw new NotFoundException(`Service '${slug}' not found`)
        }

        // A REFERENCED or NONE service has no provider to notify; the flag alone is the state.
        if (this.integrationRegistry.has(service.integrationProvider)) {
            await (enabled
                ? this.integrationRegistry.enable(service.integrationProvider!)
                : this.integrationRegistry.disable(service.integrationProvider!))
        } else {
            await this.serviceRepository.setEnabled(slug, enabled)
        }

        const updated = await this.serviceRepository.findBySlug(slug)
        if (!updated) throw new NotFoundException(`Service '${slug}' not found`)
        return this.serviceModelToResponseDto(updated)
    }

    async enable(slug: string): Promise<ServiceResponseDto> {
        return this.setEnabled(slug, true)
    }

    async disable(slug: string): Promise<ServiceResponseDto> {
        return this.setEnabled(slug, false)
    }

    async updateImageUrl(slug: string, imageUrl: string | null): Promise<ServiceResponseDto> {
        const service = await this.serviceRepository.setImageUrl(slug, imageUrl)
        if (!service) throw new NotFoundException(`Service '${slug}' not found`)
        return this.serviceModelToResponseDto(service)
    }

    async updateUrl(slug: string, url: string | null): Promise<ServiceResponseDto> {
        const service = await this.serviceRepository.setUrl(slug, url)
        if (!service) throw new NotFoundException(`Service '${slug}' not found`)
        return this.serviceModelToResponseDto(service)
    }
}
