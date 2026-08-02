import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { IServiceRepository } from '@/data/repositories'
import { ServiceModel } from '@/types/models/service'
import { ServiceResponseDto } from '@/types/dtos/serviceDto'
import { ApplicationClientNames } from '@/types/enums'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'

@Injectable()
export class ServiceManagementService {
    constructor(
        @Inject(IServiceRepository) private readonly serviceRepository: IServiceRepository,
        @Inject(ApplicationClientRegistry) private readonly clientRegistry: ApplicationClientRegistry
    ) {}

    serviceModelToResponseDto(service: ServiceModel): ServiceResponseDto {
        const dto: ServiceResponseDto = {
            id: service.id,
            name: service.name,
            enabled: service.enabled,
            url: service.url,
            imageUrl: service.imageUrl,
        }

        return dto
    }

    async list(take?: number, skip?: number): Promise<ServiceResponseDto[]> {
        const services = await this.serviceRepository.findMany({}, take, skip)
        return services.map((s) => this.serviceModelToResponseDto(s))
    }

    async enable(name: ApplicationClientNames): Promise<ServiceResponseDto> {
        if (this.clientRegistry.has(name)) {
            await this.clientRegistry.enable(name)
        } else {
            await this.serviceRepository.setEnabled(name, true)
        }
        const service = await this.serviceRepository.findByName(name)
        if (!service) throw new NotFoundException(`Service '${name}' not found`)
        return this.serviceModelToResponseDto(service)
    }

    async disable(name: ApplicationClientNames): Promise<ServiceResponseDto> {
        if (this.clientRegistry.has(name)) {
            await this.clientRegistry.disable(name)
        } else {
            await this.serviceRepository.setEnabled(name, false)
        }
        const service = await this.serviceRepository.findByName(name)
        if (!service) throw new NotFoundException(`Service '${name}' not found`)
        return this.serviceModelToResponseDto(service)
    }

    async updateImageUrl(name: ApplicationClientNames, imageUrl: string | null): Promise<ServiceResponseDto> {
        const service = await this.serviceRepository.setImageUrl(name, imageUrl)
        if (!service) throw new NotFoundException(`Service '${name}' not found`)
        return this.serviceModelToResponseDto(service)
    }
}
