import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseService } from './base.service'
import { ISystemMetadataRepository } from '@/data/repositories/ISystemMetadataRepository'
import { SystemConfigKey, SystemConfigMap } from '@/types/models/SystemConfig'
import { systemDefaults } from '@/data/config.defaults'

@Injectable()
export class ConfigService extends BaseService implements OnApplicationBootstrap {
    private cache = new Map<SystemConfigKey, unknown>()

    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(ISystemMetadataRepository) private systemMetadataRepository: ISystemMetadataRepository
    ) {
        super(logger)
    }

    async onApplicationBootstrap(): Promise<void> {
        await this.ensureSystemConfigExists()
        await this.loadAll()
    }

    get<K extends SystemConfigKey>(key: K): SystemConfigMap[K] {
        return (this.cache.get(key) ?? systemDefaults[key]) as SystemConfigMap[K]
    }

    async reload<K extends SystemConfigKey>(key: K): Promise<SystemConfigMap[K]> {
        const value = await this.systemMetadataRepository.get(key)
        this.cache.set(key, value)
        return value
    }

    private async loadAll(): Promise<void> {
        for (const key of Object.values(SystemConfigKey)) {
            const value = await this.systemMetadataRepository.get(key)
            this.cache.set(key, value)
        }
    }

    /**
     * Ensures every SystemConfigKey has a corresponding DB row.
     * On first boot, persists code defaults so the DB is the source of truth for admin edits.
     */
    private async ensureSystemConfigExists(): Promise<void> {
        for (const key of Object.values(SystemConfigKey)) {
            const exists = await this.systemMetadataRepository.exists(key)

            if (!exists) {
                const defaults = systemDefaults[key]
                await this.systemMetadataRepository.set(key, defaults)
                this.logger.log(`Persisted default configuration for '${key}' to database`)
            }
        }
    }
}
