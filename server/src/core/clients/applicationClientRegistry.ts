import { ServiceRepository } from "@/data/repositories/service.repository";
import { LoggingProvider } from "@/infrastructure/logger.provider";
import { ApplicationClientNames } from "@/types/enums";
import { Inject, Injectable } from "@nestjs/common";
import { IApplicationClient } from "./IApplicationClient";
import { IServiceRepository } from "@/data/repositories";

@Injectable() 
export class ApplicationClientRegistry{
    private readonly clients = new Map<ApplicationClientNames, IApplicationClient>()
    constructor(
        @Inject(LoggingProvider) private logger: LoggingProvider,
        @Inject(IServiceRepository) private applicationClientRepository: ServiceRepository
    ){
        this.logger.setContext(this.constructor.name)
    }

    async register(client: IApplicationClient): Promise<void> {
        if (this.clients.has(client.name)) {
            throw new Error(
                `Application client "${client.name}" is already registered`,
            )
        }

        const dbClinet = await this.applicationClientRepository.findByName(client.name)

        if(!dbClinet || dbClinet.name == ""){
            throw new Error(`Cannot register Application client "${client.name}". The client is not a configured service`,)
        }

        this.clients.set(client.name, client)
    }

    has(name: ApplicationClientNames): boolean {
        return this.clients.has(name)
    }

    get(name: ApplicationClientNames): IApplicationClient {
        const client = this.clients.get(name)

        if (!client) {
            throw new Error(
                `Application client "${name}" was not registered`,
            )
        }

        return client
    }

    getAll(): IApplicationClient[] {
        return [...this.clients.values()]
    }

     async isEnabled(name: ApplicationClientNames): Promise<boolean> {
        this.get(name)

        return this.applicationClientRepository.isEnabled(name)
    }

    async enable(name: ApplicationClientNames): Promise<void> {
        const client = this.get(name)

        const alreadyEnabled = await this.applicationClientRepository.isEnabled(name)

        if (alreadyEnabled) {
            return
        }

        await this.applicationClientRepository.setEnabled(name, true)
        await client.onEnable?.()
    }

    async disable(name: ApplicationClientNames): Promise<void> {
        const client = this.get(name)

        const alreadyEnabled = await this.applicationClientRepository.isEnabled(name)

        if (!alreadyEnabled) {
            return
        }

        await this.applicationClientRepository.setEnabled(name, false)
        await client.onDisable?.()
    }

    async getEnabled(): Promise<IApplicationClient[]> {
        const enabledClients: IApplicationClient[] = []

        for (const client of this.clients.values()) {
            const isEnabled = await this.applicationClientRepository.isEnabled(client.name)

            if (isEnabled) {
                enabledClients.push(client)
            }
        }

        return enabledClients
    }

}