/** Days a soft-deleted user is retained before `cleanup_deleted_users` hard-deletes the account. */
export const DELETED_USER_RETENTION_DAYS = 60

/** Days log entries are retained before `purge_old_logs` deletes them. */
export const LOG_RETENTION_DAYS = 30

/** Days task run history is retained before `purge_old_task_runs` deletes it. */
export const TASK_RUN_RETENTION_DAYS = 60
