import { Service } from '@prisma/generated';
import { ServiceCreateRequestDto, ServiceDeleteRequestDto, ServiceFilterOptions, ServiceLoadRequestDto, ServiceUpdateRequestDto } from '@/types/dtos/serviceDto';

export const IServiceRepository = Symbol('IServiceRepository');

export interface IServiceRepository {
    get(request: ServiceLoadRequestDto): Promise<Service | null>;
    getByName(name: string): Promise<Service | null>;
    getMany(filter: ServiceFilterOptions): Promise<Service[]>;
    post(request: ServiceCreateRequestDto): Promise<Service | null>;
    put(request: ServiceUpdateRequestDto): Promise<Service | null>;
    delete(request: ServiceDeleteRequestDto): Promise<void>;
}
