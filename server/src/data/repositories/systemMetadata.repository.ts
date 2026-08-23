import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { ISystemMetadataRepository } from './ISystemMetadataRepository'
import { SystemConfigKey, SystemConfigMap } from '@/types/models/SystemConfig'
import { systemDefaults } from '@/data/config.defaults'
import { mapPrismaError } from './util'

@Injectable()
export class SystemMetadataRepository extends BaseRepository implements ISystemMetadataRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    async get<K extends SystemConfigKey>(key: K): Promise<SystemConfigMap[K]> {
        try {
            const row = await this.db.systemMetadata.findUnique({ where: { key } })

            const defaults = systemDefaults[key]

            if (!row) {
                return structuredClone(defaults) as SystemConfigMap[K]
            }

            // Deep merge: DB values override defaults per-property
            return this.deepMerge(defaults, row.value as Partial<SystemConfigMap[K]>) as SystemConfigMap[K]
        } catch (error) {
            this.logger.error(`get failed for key: ${key}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error)
        }
    }

    async set<K extends SystemConfigKey>(key: K, value: SystemConfigMap[K]): Promise<void> {
        try {
            await this.db.systemMetadata.upsert({
                where: { key },
                create: { key, value: value as object },
                update: { value: value as object },
            })
        } catch (error) {
            this.logger.error(`set failed for key: ${key}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error)
        }
    }

    async exists(key: SystemConfigKey): Promise<boolean> {
        try {
            const row = await this.db.systemMetadata.findUnique({ where: { key } })
            return row !== null
        } catch (error) {
            this.logger.error(`exists failed for key: ${key}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error)
        }
    }

    /**
     * Compares the current DB row against code defaults and writes back any keys that are
     * missing from the stored value. Returns the list of newly-persisted keys.
     * This handles the case where a new task is added to config.defaults.ts but an existing
     * DB row predates it and will never be rewritten otherwise.
     */
    async syncDefaults<K extends SystemConfigKey>(key: K): Promise<string[]> {
        try {
            const row = await this.db.systemMetadata.findUnique({ where: { key } })

            if (!row) {
                return []
            }

            const stored = row.value as Record<string, unknown>
            const defaults = systemDefaults[key] as Record<string, unknown>
            const newKeys = Object.keys(defaults).filter((k) => !(k in stored))

            if (newKeys.length === 0) {
                return []
            }

            const merged = this.deepMerge(
                defaults as SystemConfigMap[K],
                stored as Partial<SystemConfigMap[K]>
            )
            await this.db.systemMetadata.update({ where: { key }, data: { value: merged as object } })

            return newKeys
        } catch (error) {
            this.logger.error(`syncDefaults failed for key: ${key}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error)
        }
    }

    private deepMerge<T extends Record<string, unknown>>(defaults: T, overrides: Partial<T>): T {
        const result = structuredClone(defaults)

        for (const key of Object.keys(overrides) as (keyof T)[]) {
            const overrideValue = overrides[key]

            if (overrideValue === undefined || overrideValue === null) {
                continue
            }

            if (
                typeof overrideValue === 'object' &&
                !Array.isArray(overrideValue) &&
                typeof result[key] === 'object' &&
                !Array.isArray(result[key])
            ) {
                result[key] = this.deepMerge(
                    result[key] as Record<string, unknown>,
                    overrideValue as Record<string, unknown>
                ) as T[keyof T]
            } else {
                result[key] = overrideValue as T[keyof T]
            }
        }

        return result
    }
}
