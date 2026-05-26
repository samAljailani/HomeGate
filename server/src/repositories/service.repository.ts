import { Injectable, Inject } from '@nestjs/common';
import { PrismaProvider } from '@/infrastructure/prisma.provider';
import { Service } from '@prisma/generated';
import { ServiceCreateRequestDto, ServiceDeleteRequestDto, ServiceFilterOptions, ServiceLoadRequestDto, ServiceUpdateRequestDto } from '@/types/dtos/serviceDto';
import { IServiceRepository } from './IServiceRepository';

@Injectable()
export class ServiceRepository implements IServiceRepository {
    private db: PrismaProvider;
    constructor(@Inject(PrismaProvider) db: PrismaProvider) {
        this.db = db;
    }

    async get(request: ServiceLoadRequestDto): Promise<Service | null> {
        return this.db.service.findUnique({
            where: { id: request.id },
        });
    }

    async getByName(name: string): Promise<Service | null> {
        return this.db.service.findUnique({
            where: { name },
        });
    }

    async getMany(filter: ServiceFilterOptions): Promise<Service[]> {
        return this.db.service.findMany({
            where: { ...filter },
        });
    }

    async post(request: ServiceCreateRequestDto): Promise<Service | null> {
        return this.db.service.create({
            data: request,
        });
    }

    async put(request: ServiceUpdateRequestDto): Promise<Service | null> {
        const { id, ...data } = request;
        return this.db.service.update({
            where: { id },
            data,
        });
    }

    async delete(request: ServiceDeleteRequestDto): Promise<void> {
        await this.db.service.delete({
            where: { id: request.id },
        });
    }
}
