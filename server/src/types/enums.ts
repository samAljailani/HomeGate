export enum HomeGateHeader {
    CorrelationId = 'X-Correlation-ID',
}

export enum LogLevel {
    Verbose = 'verbose',
    Debug = 'debug',
    Log = 'log',
    Warn = 'warn',
    Error = 'error',
    Fatal = 'fatal',
}

export enum LogFormat {
    Console = 'console',
    Json = 'json',
}

export enum LogColor {
    RED = 31,
    GREEN = 32,
    YELLOW = 33,
    BLUE = 34,
    MAGENTA_BRIGHT = 95,
    CYAN_BRIGHT = 96,
}

export enum LogTarget {
    Console = 'console',
    Database = 'database',
}

export enum ImmichProvisioningMode {
    Local = 'local',
    OAuth = 'oauth',
}

export enum ApplicationClientNames {
    Jellyfin = 'jellyfin',
    Immich = 'immich',
}

export enum UserAccountStatus {
    provisioning = 'provisioning',
    active = 'active',
    failed = 'failed',
    cancelling = 'cancelling',
    cancelled = 'cancelled',
    expired = 'expired',
    disabling = 'disabling',
    disabled = 'disabled',
    enabling = 'enabling',
}

export enum FailedOperation {
    provisioning = 'provisioning',
    cancellation = 'cancellation',
    expiration = 'expiration',
    sync = 'sync',
}
