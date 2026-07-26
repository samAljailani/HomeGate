import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseService } from './base.service'
import { ISystemMetadataRepository } from '@/data/repositories/ISystemMetadataRepository'
import { SystemConfigKey } from '@/types/models/SystemConfig'
import { systemDefaults } from '@/data/config.defaults'

@Injectable()
export class ConfigService extends BaseService implements OnApplicationBootstrap {
    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(ISystemMetadataRepository) private systemMetadataRepository: ISystemMetadataRepository
    ) {
        super(logger)
    }

    async onApplicationBootstrap(): Promise<void> {
        await this.ensureSystemConfigExists()
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
