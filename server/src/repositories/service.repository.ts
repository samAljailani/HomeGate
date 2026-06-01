import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { IServiceRepository } from './IServiceRepository'
import type { ServiceModel as PrismaService } from '@prisma/generated/models'
import { CreateServiceModel, ServiceModel, UpdateServiceModel, ServiceFilterOptions } from '@/types/models/service'

@Injectable()
export class ServiceRepository implements IServiceRepository {
    private db: PrismaProvider
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db
    }

    private mapService(service: PrismaService): ServiceModel {
        return {
            id: service.id,
            name: service.name,
            authSchemeId: service.authSchemeId,
        }
    }

    async findById(id: number): Promise<ServiceModel | null> {
        const service = await this.db.service.findUnique({
            where: { id: id },
        })

        return service ? this.mapService(service) : null
    }

    async findByName(name: string): Promise<ServiceModel | null> {
        const service = await this.db.service.findUnique({
            where: { name },
        })

        return service ? this.mapService(service) : null
    }

    async findMany(filter: ServiceFilterOptions): Promise<ServiceModel[]> {
        const services = await this.db.service.findMany({
            where: { ...filter },
        })

        return services.map((service) => this.mapService(service))
    }

    async create(request: CreateServiceModel): Promise<ServiceModel | null> {
        const service = await this.db.service.create({
            data: request,
        })

        return this.mapService(service)
    }

    async update(request: UpdateServiceModel): Promise<ServiceModel | null> {
        const { id, ...data } = request
        const service = await this.db.service.update({
            where: { id: id },
            data,
        })

        return this.mapService(service)
    }

    async delete(id: number): Promise<void> {
        await this.db.service.delete({
            where: { id: id },
        })
    }
}
