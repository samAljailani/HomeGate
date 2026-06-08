import { HomeGateHeader, LogFormat, LogTarget } from '@/types/enums'
import { AppEnv, EnvData } from '@/types/models/EnvData'
import { Injectable } from '@nestjs/common'
import { CLS_ID } from 'nestjs-cls'
import { Request, Response } from 'express'
import { OAuthProviderName } from '@prisma/generated'
import { ImmichProvisioningMode } from '@/types/enums'

const getEnv = (): EnvData => {
    const APP_ENV = process.env['APP_ENV']
    const CLIENT_RELATIVE_STATIC_PATH = process.env['CLIENT_RELATIVE_STATIC_PATH']
    const PORT = process.env['PORT']
    const HOST = process.env['HOST']
    // const SERVER_BASE_URL = process.env['SERVER_BASE_URL']
    const GOOGLE_CLIENT_ID = process.env['GOOGLE_CLIENT_ID']
    const GOOGLE_CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET']
    const DATABASE_URL = process.env['DATABASE_URL']
    const SESSION_SECRET = process.env['SESSION_SECRET']
    const SESSION_COOKIE_NAME = process.env['SESSION_COOKIE_NAME']
    const LOG_TARGETS = (process.env['LOG_TARGETS'] ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean) as LogTarget[]
    const COLOR_LOGS = process.env['COLOR_LOGS']?.toLowerCase() === 'true'

    const JELLYFIN_BASE_URL = process.env['JELLYFIN_BASE_URL']
    const JELLYFIN_API_KEY = process.env['JELLYFIN_API_KEY']
    const JELLYFIN_CLIENT_NAME = process.env['JELLYFIN_CLIENT_NAME']
    const JELLYFIN_DEVICE_ID = process.env['JELLYFIN_DEVICE_ID']

    const IMMICH_BASE_URL = process.env['IMMICH_BASE_URL']
    const IMMICH_API_KEY = process.env['IMMICH_API_KEY']
    const IMMICH_PROCISIONING_MODE = process.env['IMMICH_PROVISIONING_MODE'] as ImmichProvisioningMode

    const envData: EnvData = {
        //host: process.env['HOST'];
        environment: APP_ENV!,
        port: Number.parseInt(PORT!),
        host: HOST!,
        // serverBaseUrl: SERVER_BASE_URL!,
        oAuth: {
            providers: [
                {
                    name: OAuthProviderName.google,
                    clientId: GOOGLE_CLIENT_ID!,
                    clientSecret: GOOGLE_CLIENT_SECRET!,
                    scope: ['openid', 'email', 'profile'],
                },
            ],
        },
        client: {
            buildPath: CLIENT_RELATIVE_STATIC_PATH!,
        },
        database: {
            url: DATABASE_URL!,
        },
        session: {
            secret: SESSION_SECRET!,
            cookieName: SESSION_COOKIE_NAME!,
        },
        logger: {
            targets: LOG_TARGETS,
            colorLogs: COLOR_LOGS,
            logFormat: (process.env['LOG_FORMAT'] as LogFormat) || LogFormat.Console,
        },
        cls: {
            config: {
                middleware: {
                    mount: true,
                    generateId: true,
                    setup: (cls: any, req: Request, res: Response) => {
                        const cid = req.header(HomeGateHeader.CorrelationId) || cls.get(CLS_ID)
                        cls.set(CLS_ID, cid)
                        res.header(HomeGateHeader.CorrelationId, cid)
                    },
                },
            },
        },
        jellyfin: {
            baseUrl: JELLYFIN_BASE_URL!,
            apiKey: JELLYFIN_API_KEY!,
            clientName: JELLYFIN_CLIENT_NAME!,
            deviceId: JELLYFIN_DEVICE_ID!,
        },
        immich: {
            baseUrl: IMMICH_BASE_URL!,
            apiKey: IMMICH_API_KEY!,
            provisioningMode: IMMICH_PROCISIONING_MODE!,
        },
    }

    validateEnvData(envData)

    return envData
}

const validateEnvData = (envData: EnvData): void => {
    const missing = [
        !envData.environment && 'environment',
        !envData.port && 'port',
        !envData.host && 'host',
        !envData.oAuth.providers.length && 'oAuth.providers',
        !envData.client.buildPath && 'client.BuildPath',
        !envData.database.url && 'database.url',
        !envData.session.secret && 'session.secret',
        !envData.session.cookieName && 'session.cookieName',
        !envData.cls?.config && 'cls.config',
        !envData.logger && 'logger',
        !envData.logger?.targets?.length && 'logger.targets',
        !envData.logger?.logFormat && 'logger.logFormat',
        !envData.jellyfin.baseUrl && 'jellyfin.baseUrl',
        !envData.jellyfin.apiKey && 'jellyfin.apiKey',
        !envData.jellyfin.clientName && 'jellyfin.clientName',
        !envData.jellyfin.deviceId && 'jellyfin.deviceId',
        !envData.immich.baseUrl && 'immich.baseUrl',
        !envData.immich.apiKey && 'immich.apiKey',
    ].filter(Boolean)

    if (missing.length > 0) {
        throw new Error(`Missing required config: ${missing.join(', ')}`)
    }

    // Validate each OAuth provider
    envData.oAuth.providers.forEach((provider, index) => {
        if (!provider) {
            throw new Error(`OAuth provider at index ${index} is undefined`)
        }
        if (!provider.name) {
            throw new Error(`OAuth provider at index ${index} is missing 'name'`)
        }
        if (!provider.clientId) {
            throw new Error(`OAuth provider '${provider.name}' is missing 'ClientId'`)
        }
        if (!provider.clientSecret) {
            throw new Error(`OAuth provider '${provider.name}' is missing 'ClientSecret'`)
        }
        if (!provider.scope || !provider.scope.length) {
            throw new Error(`OAuth provider '${provider.name}' is missing 'Scope'`)
        }
    })

    if (!Object.values(AppEnv).includes(envData.environment as AppEnv)) {
        throw new Error(
            `Invalid environment: ${envData.environment}. Must be one of: ${Object.values(AppEnv).join(', ')}`
        )
    }

    if (!Number.isInteger(envData.port) || envData.port <= 0) {
        throw new TypeError(`Invalid port: ${envData.port}. The port must be a valid positive integer.`)
    }

    if (!Object.values(LogFormat).includes(envData.logger.logFormat as LogFormat)) {
        throw new Error(
            `Invalid log format: ${envData.logger.logFormat}. Must be one of: ${Object.values(LogFormat).join(', ')}`
        )
    }

    if (!Object.values(ImmichProvisioningMode).includes(envData.immich.provisioningMode as ImmichProvisioningMode)) {
        throw new Error(
            `Invalid Immich provisioning mode: ${envData.immich.provisioningMode}. ` +
                `Must be one of: ${Object.values(ImmichProvisioningMode).join(', ')}`
        )
    }

    const invalidTargets = envData.logger.targets.filter(
        (target) => !Object.values(LogTarget).includes(target as LogTarget)
    )

    if (invalidTargets.length > 0) {
        throw new Error(
            `Invalid log target(s): ${invalidTargets.join(', ')}. Must be one of: ${Object.values(LogTarget).join(', ')}`
        )
    }
}

let cached: EnvData | undefined

@Injectable()
export class ConfigRepository {
    constructor() {}

    getEnv(): EnvData {
        if (!cached) {
            cached = getEnv()
        }

        return cached
    }
}

export const clearCachedEnv = () => {
    cached = undefined
}
