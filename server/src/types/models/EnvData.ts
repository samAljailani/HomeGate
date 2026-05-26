export enum AppEnv {
    Development = 'development',
    Production = 'production',
}

export interface EnvData {
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
