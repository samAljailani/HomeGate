import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { IServiceRepository } from './IServiceRepository'
import type { ServiceModel as PrismaService } from '@prisma/generated/models'
import { CreateServiceModel, ServiceModel, UpdateServiceModel, ServiceFilterOptions } from '@/types/models/service'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'

@Injectable()
export class ServiceRepository extends BaseRepository implements IServiceRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapService(service: PrismaService): ServiceModel {
        return {
            id: service.id,
            name: service.name,
            authSchemeId: service.authSchemeId,
        }
    }

    async findById(id: number): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.findUnique({ where: { id } })
            return service ? this.mapService(service) : null
        } catch (error) {
            this.logger.error(`findById failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async findByName(name: string): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.findUnique({ where: { name } })
            return service ? this.mapService(service) : null
        } catch (error) {
            this.logger.error(`findByName failed for name: ${name}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async findMany(filter: ServiceFilterOptions): Promise<ServiceModel[]> {
        try {
            const services = await this.db.service.findMany({ where: { ...filter } })
            return services.map((service) => this.mapService(service))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async create(request: CreateServiceModel): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.create({ data: request })
            return this.mapService(service)
        } catch (error) {
            this.logger.error('create failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async update(request: UpdateServiceModel): Promise<ServiceModel | null> {
        try {
            const { id, ...data } = request
            const service = await this.db.service.update({ where: { id }, data })
            return this.mapService(service)
        } catch (error) {
            this.logger.error(`update failed for id: ${request.id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async delete(id: number): Promise<void> {
        try {
            await this.db.service.delete({ where: { id } })
        } catch (error) {
            this.logger.error(`delete failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }
}
