import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { IServiceRepository } from './IServiceRepository'
import type { ServiceModel as PrismaService } from '@prisma/generated/models'
import { CreateServiceModel, ServiceModel, UpdateServiceModel, ServiceFilterOptions } from '@/types/models/service'
import { AccountType, IntegrationProvider } from '@/types/enums'
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
            slug: service.slug,
            enabled: service.enabled,
            url: service.url ?? null,
            imageUrl: service.imageUrl ?? null,
            accountType: service.accountType as AccountType,
            integrationProvider: (service.integrationProvider as IntegrationProvider) ?? null,
            accountSourceServiceId: service.accountSourceServiceId ?? null,
            defaultAllowed: service.defaultAllowed,
        }
    }

    async findById(id: number): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.findUnique({
                where: { id },
            })

            return service ? this.mapService(service) : null
        } catch (error) {
            this.logger.error(`findById failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async findBySlug(slug: string): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.findUnique({
                where: { slug },
            })

            return service ? this.mapService(service) : null
        } catch (error) {
            this.logger.error(`findBySlug failed for slug: ${slug}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async findByIntegrationProvider(provider: IntegrationProvider): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.findUnique({
                where: { integrationProvider: provider },
            })

            return service ? this.mapService(service) : null
        } catch (error) {
            this.logger.error(`findByIntegrationProvider failed for provider: ${provider}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async findMany(filter: ServiceFilterOptions, take: number = 50, skip: number = 0): Promise<ServiceModel[]> {
        try {
            const services = await this.db.service.findMany({
                where: { ...filter },
                take,
                skip,
            })

            return services.map((service) => this.mapService(service))
        } catch (error) {
            this.logger.error('findMany failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async count(filter: ServiceFilterOptions): Promise<number> {
        return this.db.service.count({ where: { ...filter } })
    }

    async findEnabled(): Promise<ServiceModel[]> {
        try {
            const services = await this.db.service.findMany({
                where: {
                    enabled: true,
                },
            })

            return services.map((service) => this.mapService(service))
        } catch (error) {
            this.logger.error('findEnabledApplicationClients failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async isEnabled(slug: string): Promise<boolean> {
        try {
            const service = await this.db.service.findUnique({
                where: { slug },
                select: { enabled: true },
            })

            return service?.enabled ?? false
        } catch (error) {
            this.logger.error(`isEnabled failed for slug: ${slug}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async setEnabled(slug: string, enabled: boolean): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.update({
                where: { slug },
                data: { enabled },
            })

            return this.mapService(service)
        } catch (error) {
            this.logger.error(`setEnabled failed for slug: ${slug}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async setImageUrl(slug: string, imageUrl: string | null): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.update({
                where: { slug },
                data: { imageUrl },
            })

            return this.mapService(service)
        } catch (error) {
            this.logger.error(`setImageUrl failed for slug: ${slug}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async setUrl(slug: string, url: string | null): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.update({
                where: { slug },
                data: { url },
            })

            return this.mapService(service)
        } catch (error) {
            this.logger.error(`setUrl failed for slug: ${slug}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }

    async create(request: CreateServiceModel): Promise<ServiceModel | null> {
        try {
            const service = await this.db.service.create({
                data: request,
            })

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

            const service = await this.db.service.update({
                where: { id },
                data,
            })

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
            await this.db.service.delete({
                where: { id },
            })
        } catch (error) {
            this.logger.error(`delete failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })

            mapPrismaError(error, repositoryErrorMessages.service)
        }
    }
}
