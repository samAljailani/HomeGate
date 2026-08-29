import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { IServiceRepository } from '@/data/repositories'
import { ServiceModel } from '@/types/models/service'
import {
    CREATABLE_ACCOUNT_TYPES,
    ExternalAccountResponseDto,
    ServiceResponseDto,
    ServicePutRequestDto,
} from '@/types/dtos/serviceDto'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { ApplicationUserModel } from '@/types/params/accountIntegration'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'
import { AccountType } from '@/types/enums'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ServiceAccessService } from './serviceAccess.service'

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

@Injectable()
export class ServiceManagementService {
    constructor(
        @Inject(IServiceRepository) private readonly serviceRepository: IServiceRepository,
        @Inject(AccountIntegrationRegistry) private readonly integrationRegistry: AccountIntegrationRegistry,
        @Inject(ServiceAccessService) private readonly accessService: ServiceAccessService,
        @Inject(LoggingProvider) private readonly logger: LoggingProvider
    ) {
        this.logger.setContext(this.constructor.name)
    }

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

    async list(userId: string, take: number = 50, skip: number = 0): Promise<PaginatedResponseDto<ServiceResponseDto>> {
        const [services, total] = await Promise.all([
            this.serviceRepository.findMany({}, take, skip),
            this.serviceRepository.count({}),
        ])
        const accessMap = await this.accessService.resolveAccess(userId, services)
        return new PaginatedResponseDto(
            services.map((s) => ({ ...this.serviceModelToResponseDto(s), allowed: accessMap.get(s.id) ?? false })),
            total,
            skip
        )
    }

    /**
     * Creates a service. Only REFERENCED and NONE are accepted: a MANAGED service needs a
     * built-in integration provider, which cannot be added at runtime.
     */
    async create(request: ServicePutRequestDto): Promise<ServiceResponseDto> {
        // Enforced here as well as on the DTO: the HTTP validator does not cover internal callers.
        if (!CREATABLE_ACCOUNT_TYPES.includes(request.accountType)) {
            throw new BadRequestException(
                `Account type '${request.accountType}' cannot be created through the API; ` +
                    `a MANAGED service requires a built-in integration provider`
            )
        }

        if (!SLUG_PATTERN.test(request.slug)) {
            throw new BadRequestException(
                'Slug must be lowercase alphanumeric words separated by single hyphens, e.g. "jellyseerr"'
            )
        }

        const accountSourceServiceId = await this.resolveAccountSource(request)

        if (await this.serviceRepository.findBySlug(request.slug)) {
            throw new ConflictException(`A service with slug '${request.slug}' already exists`)
        }

        const [nameClash] = await this.serviceRepository.findMany({ name: request.name }, 1)

        if (nameClash) {
            throw new ConflictException(`A service named '${request.name}' already exists`)
        }

        const service = await this.serviceRepository.create({
            name: request.name,
            slug: request.slug,
            enabled: request.enabled ?? true,
            accountType: request.accountType as AccountType,
            integrationProvider: null,
            accountSourceServiceId,
            defaultAllowed: request.defaultAllowed ?? true,
            url: request.url ?? null,
            imageUrl: request.imageUrl ?? null,
        })

        if (!service) {
            throw new BadRequestException(`Failed to create service '${request.slug}'`)
        }

        this.logger.log(
            `Service '${service.slug}' created as ${service.accountType}` +
                (accountSourceServiceId ? ` sourcing accounts from service '${accountSourceServiceId}'` : '')
        )

        return this.serviceModelToResponseDto(service)
    }

    private async resolveAccountSource(request: ServicePutRequestDto): Promise<number | null> {
        if (request.accountType !== AccountType.REFERENCED) {
            if (request.accountSourceServiceId != null) {
                throw new BadRequestException('Only a REFERENCED service may name an account source')
            }

            return null
        }

        if (request.accountSourceServiceId == null) {
            throw new BadRequestException('A REFERENCED service must name the service supplying its accounts')
        }

        const source = await this.serviceRepository.findById(request.accountSourceServiceId)

        if (!source) {
            throw new BadRequestException(`Account source service '${request.accountSourceServiceId}' does not exist`)
        }

        // Chaining references would make the entitlement clamp ambiguous.
        if (source.accountType !== AccountType.MANAGED) {
            throw new BadRequestException(
                `Account source '${source.slug}' must be a MANAGED service, but it is ${source.accountType}`
            )
        }

        return source.id
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
