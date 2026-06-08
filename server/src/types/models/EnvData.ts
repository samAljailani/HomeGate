import { OAuthProviderName } from '@prisma/generated'
import { ClsModuleOptions } from 'nestjs-cls'
import { LogFormat, LogTarget } from '@/types/enums'
import { ImmichProvisioningMode } from '@/types/enums'

export enum AppEnv {
    Development = 'development',
    Production = 'production',
}

export interface EnvDataOld {
    staticClientFilesPath: string
    PORT: string
    SERVER_BASE_URL: string
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    DATABASE_URL: string
    SESSION_SECRET: string
    SESSION_COOKIE_NAME: string
    APP_ENV: AppEnv
}

export interface EnvData {
    host: string
    environment: string
    port: number
    //serverBaseUrl: string
    oAuth: {
        providers: Array<{
            name: OAuthProviderName
            clientId: string
            clientSecret: string
            scope: string[]
        }>
    }
    client: {
        buildPath: string
    }
    database: {
        url: string
    }
    session: {
        secret: string
        cookieName: string
    }
    logger: {
        targets: LogTarget[]
        colorLogs: boolean
        logFormat: LogFormat
    }
    cls: {
        config: ClsModuleOptions
    }
    jellyfin: {
        baseUrl: string
        apiKey: string
        clientName: string
        deviceId: string
    }
    immich: {
        baseUrl: string
        apiKey: string
        provisioningMode: ImmichProvisioningMode
    }
}
