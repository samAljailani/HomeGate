import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { IServiceRepository } from '@/data/repositories'
import { ServiceModel } from '@/types/models/service'
import { ApplicationClientNames } from '@/types/enums'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'

@Injectable()
export class ServiceManagementService {
    constructor(
        @Inject(IServiceRepository) private readonly serviceRepository: IServiceRepository,
        @Inject(ApplicationClientRegistry) private readonly clientRegistry: ApplicationClientRegistry
    ) {}

    async list(take?: number, skip?: number): Promise<ServiceModel[]> {
        return this.serviceRepository.findMany({}, take, skip)
    }

    async enable(name: ApplicationClientNames): Promise<ServiceModel> {
        if (this.clientRegistry.has(name)) {
            await this.clientRegistry.enable(name)
        } else {
            await this.serviceRepository.setEnabled(name, true)
        }
        const service = await this.serviceRepository.findByName(name)
        if (!service) throw new NotFoundException(`Service '${name}' not found`)
        return service
    }

    async disable(name: ApplicationClientNames): Promise<ServiceModel> {
        if (this.clientRegistry.has(name)) {
            await this.clientRegistry.disable(name)
        } else {
            await this.serviceRepository.setEnabled(name, false)
        }
        const service = await this.serviceRepository.findByName(name)
        if (!service) throw new NotFoundException(`Service '${name}' not found`)
        return service
    }
}
