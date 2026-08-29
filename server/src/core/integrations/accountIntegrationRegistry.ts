import { LoggingProvider } from '@/infrastructure/logger.provider'
import { AccountType, IntegrationProvider } from '@/types/enums'
import { Inject, Injectable } from '@nestjs/common'
import { IAccountIntegrationProvider } from './IAccountIntegrationProvider'
import { IServiceRepository } from '@/data/repositories'
import { ServiceModel } from '@/types/models/service'

/**
 * Holds the vendor integrations HomeGate can provision accounts through, keyed by provider.
 * REFERENCED and NONE services have no provider and must never reach this registry.
 */
@Injectable()
export class AccountIntegrationRegistry {
    private readonly providers = new Map<IntegrationProvider, IAccountIntegrationProvider>()

    constructor(
        @Inject(LoggingProvider) private logger: LoggingProvider,
        @Inject(IServiceRepository) private serviceRepository: IServiceRepository
    ) {
        this.logger.setContext(this.constructor.name)
    }

    /** True when the service provisions accounts through an integration and therefore needs a provider. */
    static requiresIntegration(service: Pick<ServiceModel, 'accountType' | 'integrationProvider'>): boolean {
        return service.accountType === AccountType.MANAGED && service.integrationProvider !== null
    }

    async register(provider: IAccountIntegrationProvider): Promise<void> {
        if (this.providers.has(provider.name)) {
            this.logger.fatal(`Account integration provider "${provider.name}" is already registered`)
            throw new Error(`Account integration provider "${provider.name}" is already registered`)
        }

        const service = await this.serviceRepository.findByIntegrationProvider(provider.name)

        // Not fatal: an admin may have removed the service. The provider simply stays unavailable.
        if (!service) {
            this.logger.warn(
                `Account integration provider "${provider.name}" has no configured service and was not registered`
            )
            return
        }

        this.providers.set(provider.name, provider)
    }

    has(name: IntegrationProvider | null): boolean {
        return name !== null && this.providers.has(name)
    }

    get(name: IntegrationProvider | null): IAccountIntegrationProvider | null {
        return name === null ? null : this.providers.get(name) ?? null
    }

    getAll(): IAccountIntegrationProvider[] {
        return [...this.providers.values()]
    }

    async isEnabled(name: IntegrationProvider): Promise<boolean> {
        const service = await this.serviceRepository.findByIntegrationProvider(name)

        return service?.enabled ?? false
    }

    async enable(name: IntegrationProvider): Promise<void> {
        const provider = this.get(name)
        const service = await this.serviceRepository.findByIntegrationProvider(name)

        if (!provider || !service || service.enabled) {
            return
        }

        await this.serviceRepository.setEnabled(service.slug, true)
        await provider.onEnable?.()
    }

    async disable(name: IntegrationProvider): Promise<void> {
        const provider = this.get(name)
        const service = await this.serviceRepository.findByIntegrationProvider(name)

        if (!provider || !service || !service.enabled) {
            return
        }

        await this.serviceRepository.setEnabled(service.slug, false)
        await provider.onDisable?.()
    }

    /** Enabled MANAGED services only; a service without an integration can never appear here. */
    async getEnabled(): Promise<IAccountIntegrationProvider[]> {
        const services = await this.serviceRepository.findMany(
            { enabled: true, accountType: AccountType.MANAGED },
            Number.MAX_SAFE_INTEGER
        )

        return services
            .map((service) => this.get(service.integrationProvider))
            .filter((provider): provider is IAccountIntegrationProvider => provider !== null)
    }
}
