import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { IServiceRepository } from '@/data/repositories'
import { ServiceModel } from '@/types/models/service'
import { ExternalAccountResponseDto, ServiceResponseDto } from '@/types/dtos/serviceDto'
import { ApplicationClientNames } from '@/types/enums'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { ApplicationUserModel } from '@/types/params/application.client'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'

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

    applicationUserModelToResponseDto(user: ApplicationUserModel): ExternalAccountResponseDto {
        return {
            id: user.id,
            username: user.username,
            isActive: user.isActive,
            isAdmin: user.isAdmin,
        }
    }

    async listExternalAccounts(name: ApplicationClientNames): Promise<ExternalAccountResponseDto[]> {
        if (!this.clientRegistry.has(name)) {
            throw new BadRequestException(`Service '${name}' is not an integrated external client`)
        }

        const users = await this.clientRegistry.get(name).getAllUsers()
        return (users ?? []).map((u) => this.applicationUserModelToResponseDto(u))
    }

    async list(take: number = 50, skip: number = 0): Promise<PaginatedResponseDto<ServiceResponseDto>> {
        const [services, total] = await Promise.all([
            this.serviceRepository.findMany({}, take, skip),
            this.serviceRepository.count({}),
        ])
        return new PaginatedResponseDto(services.map((s) => this.serviceModelToResponseDto(s)), total, skip)
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
