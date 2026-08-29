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

export enum IntegrationProvider {
    Jellyfin = 'jellyfin',
    Immich = 'immich',
}

export enum AccountType {
    /** HomeGate provisions and owns an external account through an integration provider. */
    MANAGED = 'MANAGED',
    /** Access relies on another service's account; nothing to provision here. */
    REFERENCED = 'REFERENCED',
    /** No account of any kind; the subscription is purely an access grant. */
    NONE = 'NONE',
}

export enum SubscriptionStatus {
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

export enum ScheduledTasks {
    PROCESS_SUBSCRIPTIONS = 'process_subscriptions',
    CLEANUP_STALE_LOCAL_ACCOUNTS = 'cleanup_stale_local_accounts',
    SYNC_INTEGRATION_ACCOUNTS = 'sync_integration_accounts',
    CLEANUP_DELETED_USERS = 'cleanup_deleted_users',
    PURGE_OLD_LOGS = 'purge_old_logs',
    PURGE_OLD_TASK_RUNS = 'purge_old_task_runs',
    PURGE_EXPIRED_SESSIONS = 'purge_expired_sessions',
}

export enum AppEvent {
    INVITE_CLAIMED = 'invite.claimed',
}
