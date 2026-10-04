import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseService } from './base.service'
import { ISystemMetadataRepository } from '@/data/repositories/ISystemMetadataRepository'
import { SystemConfigKey, SystemConfigMap } from '@/types/models/SystemConfig'
import { systemDefaults } from '@/data/config.defaults'
import { EnvRepository } from '@/data/repositories/env.repository'
import { resolve } from 'node:path'

// Image policy lives here so consumers do not define their own limits.
export const imageLibraryDefaults = Object.freeze({
    maxImageBytes: 10 * 1024 * 1024,
    requestMetadataBytes: 1024,
    maxSvgBytes: 256 * 1024,
    maxPixels: 4_194_304,
    maxDimension: 4096,
    decodeTimeoutSeconds: 5,
    maxSvgElements: 2000,
    maxSvgDepth: 32,
    maxSvgAttributeLength: 10_000,
    maxSvgViewBoxCoordinate: 1_000_000,
    maxImages: 500,
    maxLibraryBytes: 100 * 1024 * 1024,
    fileMode: 0o640,
    initializationMarker: '.initialized',
    publicPath: '/images',
    seedDirectoryName: 'images',
    protectedNames: ['logo.svg'] as readonly string[],
    filenamePattern:
        /^(?!(?:[cC][oO][nN]|[pP][rR][nN]|[aA][uU][xX]|[nN][uU][lL]|[cC][oO][mM][1-9]|[lL][pP][tT][1-9])\.)[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.(?:png|svg)$/,
    mimeTypes: ['image/png', 'image/svg+xml'] as readonly string[],
    svgElements:
        'svg g defs path rect circle ellipse line polygon polyline linearGradient radialGradient stop clipPath mask use title desc text tspan'.split(
            ' '
        ),
    svgAttributes:
        'id viewBox width height x y x1 y1 x2 y2 cx cy r rx ry d points transform fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity clip-path clip-rule mask gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity href preserveAspectRatio font-size font-family font-weight text-anchor dominant-baseline dx dy'.split(
            ' '
        ),
    mutationThrottle: { ttl: 60_000, limit: 10 },
    responseHeaders: {
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
        'Cache-Control': 'no-cache',
    },
})

export type ImageValidationConfig = {
    readonly [K in keyof typeof imageLibraryDefaults]: (typeof imageLibraryDefaults)[K] extends number
        ? number
        : (typeof imageLibraryDefaults)[K]
}
export type ImageLibraryConfig = ImageValidationConfig & {
    directory: string
    seedDirectory: string
    baseUrl: string
    maxBase64Length: number
    requestBodyLimitBytes: number
}

@Injectable()
export class ConfigService extends BaseService implements OnApplicationBootstrap {
    private cache = new Map<SystemConfigKey, unknown>()

    constructor(
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(ISystemMetadataRepository) private systemMetadataRepository: ISystemMetadataRepository,
        @Inject(EnvRepository) private readonly env: EnvRepository
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

    getImageLibraryConfig(): ImageLibraryConfig {
        const env = this.env.getEnv()
        if (!env.client.imageStoragePath?.trim()) throw new Error('Missing required config: IMAGE_STORAGE_PATH')
        if (!env.client.buildPath?.trim()) throw new Error('Missing required config: CLIENT_RELATIVE_STATIC_PATH')
        if (!env.host?.trim()) throw new Error('Missing required config: HOST')
        let host: URL
        try {
            host = new URL(env.host)
        } catch {
            throw new Error('Invalid HOST: must be an absolute HTTP or HTTPS URL.')
        }
        if (!['http:', 'https:'].includes(host.protocol))
            throw new Error('Invalid HOST: must be an absolute HTTP or HTTPS URL.')
        return {
            ...imageLibraryDefaults,
            maxBase64Length: Math.ceil(imageLibraryDefaults.maxImageBytes / 3) * 4,
            requestBodyLimitBytes:
                Math.ceil(imageLibraryDefaults.maxImageBytes / 3) * 4 + imageLibraryDefaults.requestMetadataBytes,
            directory: resolve(env.client.imageStoragePath),
            seedDirectory: resolve(env.client.buildPath, imageLibraryDefaults.seedDirectoryName),
            baseUrl: host.href,
        }
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
