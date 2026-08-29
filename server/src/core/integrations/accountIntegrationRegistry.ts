import { LoggingProvider } from '@/infrastructure/logger.provider'
import { IntegrationProvider } from '@/types/enums'
import { Inject, Injectable } from '@nestjs/common'
import { IAccountIntegrationProvider } from './IAccountIntegrationProvider'
import { IServiceRepository } from '@/data/repositories'

@Injectable()
export class AccountIntegrationRegistry {
    private readonly providers = new Map<IntegrationProvider, IAccountIntegrationProvider>()
    constructor(
        @Inject(LoggingProvider) private logger: LoggingProvider,
        @Inject(IServiceRepository) private serviceRepository: IServiceRepository
    ) {
        this.logger.setContext(this.constructor.name)
    }

    async register(provider: IAccountIntegrationProvider): Promise<void> {
        if (this.providers.has(provider.name)) {
            this.logger.fatal(`Account integration provider "${provider.name}" is already registered`)
            throw new Error(`Account integration provider "${provider.name}" is already registered`)
        }

        const dbService = await this.serviceRepository.findByName(provider.name)

        if (!dbService || dbService.name == '') {
            this.logger.fatal(
                `Cannot register account integration provider "${provider.name}". It is not a configured service`
            )
            throw new Error(
                `Cannot register account integration provider "${provider.name}". It is not a configured service`
            )
        }

        this.providers.set(provider.name, provider)
    }

    has(name: IntegrationProvider): boolean {
        return this.providers.has(name)
    }

    get(name: IntegrationProvider): IAccountIntegrationProvider {
        const provider = this.providers.get(name)

        if (!provider) {
            throw new Error(`Account integration provider "${name}" was not registered`)
        }

        return provider
    }

    getAll(): IAccountIntegrationProvider[] {
        return [...this.providers.values()]
    }

    async isEnabled(name: IntegrationProvider): Promise<boolean> {
        this.get(name)

        return this.serviceRepository.isEnabled(name)
    }

    async enable(name: IntegrationProvider): Promise<void> {
        const provider = this.get(name)

        const alreadyEnabled = await this.serviceRepository.isEnabled(name)

        if (alreadyEnabled) {
            return
        }

        await this.serviceRepository.setEnabled(name, true)
        await provider.onEnable?.()
    }

    async disable(name: IntegrationProvider): Promise<void> {
        const provider = this.get(name)

        const alreadyEnabled = await this.serviceRepository.isEnabled(name)

        if (!alreadyEnabled) {
            return
        }

        await this.serviceRepository.setEnabled(name, false)
        await provider.onDisable?.()
    }

    async getEnabled(): Promise<IAccountIntegrationProvider[]> {
        const enabledProviders: IAccountIntegrationProvider[] = []

        for (const provider of this.providers.values()) {
            const isEnabled = await this.serviceRepository.isEnabled(provider.name)

            if (isEnabled) {
                enabledProviders.push(provider)
            }
        }

        return enabledProviders
    }
}
