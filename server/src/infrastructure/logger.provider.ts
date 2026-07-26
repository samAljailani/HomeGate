import { Scope, Injectable, Inject } from '@nestjs/common'
import { isLogLevelEnabled } from '@nestjs/common/services/utils/is-log-level-enabled.util'
import { ClsService } from 'nestjs-cls'
import { ConfigRepository } from '@/data/repositories/config.repository'
import { LogColor, LogFormat, LogLevel, LogTarget } from '@/types/enums'
import { ILoggingRepository } from '@/data/repositories/ILoggingRepository'

type LogDetails = {
    context?: string
    stackTrace?: string | undefined
    targets?: LogTarget[]
}

type LogFunction = () => string

const LOG_LEVELS = [LogLevel.Verbose, LogLevel.Debug, LogLevel.Log, LogLevel.Warn, LogLevel.Error, LogLevel.Fatal]

let appName: string | undefined
let logLevels: LogLevel[] = [
    LogLevel.Verbose,
    LogLevel.Debug,
    LogLevel.Log,
    LogLevel.Warn,
    LogLevel.Error,
    LogLevel.Fatal,
]

export const APP_LOGGERS = Symbol('APP_LOGGERS')
export interface IAppLogger {
    target: LogTarget
    setContext(context: string): void
    isLevelEnabled(level: LogLevel): boolean

    verbose(message: string | Error, optinos?: LogDetails): void
    debug(message: string | Error, options?: LogDetails): void
    log(message: string | Error, options?: LogDetails): void
    warn(message: string | Error, options?: LogDetails): void
    error(message: string | Error, options?: LogDetails): void
    fatal(message: string | Error, options?: LogDetails): void
}

export class DatabaseLogger implements IAppLogger {
    public readonly target = LogTarget.Database
    private context?: string

    constructor(
        private loggingRepository: ILoggingRepository,
        private cls: ClsService | undefined,
        options?: { context: string }
    ) {
        this.context = options?.context || DatabaseLogger.name
    }

    public verbose(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Verbose, message, options)
    }

    public debug(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Debug, message, options)
    }

    public log(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Log, message, options)
    }

    public warn(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Warn, message, options)
    }

    public error(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Error, message, {
            ...options,
            stackTrace: options?.stackTrace ?? (message instanceof Error ? message.stack : undefined),
        })
    }

    public fatal(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Fatal, message, {
            ...options,
            stackTrace: options?.stackTrace ?? (message instanceof Error ? message.stack : undefined),
        })
    }

    private write(level: LogLevel, message: string | Error, options?: LogDetails): void {
        if (!this.isLevelEnabled(level)) {
            return
        }

        const logMessage = message instanceof Error ? message.message : message
        const context = options?.context ?? this.context ?? null
        const stackTrace = options?.stackTrace ?? null

        this.loggingRepository.create({
            userId: null,
            sessionId: null,
            correlationId: this.cls?.getId() ?? null,
            message: logMessage,
            context,
            stackTrace,
            logLevel: level,
        })
        // void Promise.resolve(
        //     this.loggingRepository.post({
        //         userId: null,
        //         sessionId: null,
        //         correlationId: this.cls?.getId() ?? null,
        //         message: logMessage,
        //         context,
        //         stackTrace,
        //         logLevel: level,
        //     })
        // ).catch((error) => {
        //     console.error('Failed to write log to database', error)
        // })
    }

    public setContext(context: string) {
        this.context = context
    }
    public isLevelEnabled(level: LogLevel) {
        return isLogLevelEnabled(level, logLevels)
    }

    public formatContext(context: string): string {
        let prefix = appName || ''
        if (context) {
            prefix += (prefix ? ':' : '') + context
        }

        const correlationId = this.cls?.getId()
        if (correlationId) {
            prefix += `~${correlationId}`
        }

        if (!prefix) {
            return ''
        }

        return `[${prefix}]` + ' '
    }
}

export class ConsoleLogger implements IAppLogger {
    public readonly target = LogTarget.Console

    private context?: string
    private isColorEnabled: boolean
    private isJsonEnabled: boolean

    private readonly timestampFormatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    })

    constructor(
        private cls: ClsService | undefined,
        options?: { json?: boolean; color?: boolean; context?: string }
    ) {
        this.context = options?.context || ConsoleLogger.name
        this.isJsonEnabled = options?.json ?? false
        this.isColorEnabled = !this.isJsonEnabled && (options?.color ?? false)
    }

    public verbose(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Verbose, message, options)
    }

    public debug(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Debug, message, options)
    }

    public log(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Log, message, options)
    }

    public warn(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Warn, message, options)
    }

    public error(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Error, message, {
            ...options,
            stackTrace: options?.stackTrace ?? (message instanceof Error ? message.stack : undefined),
        })
    }

    public fatal(message: string | Error, options?: LogDetails): void {
        this.write(LogLevel.Fatal, message, {
            ...options,
            stackTrace: options?.stackTrace ?? (message instanceof Error ? message.stack : undefined),
        })
    }

    public setContext(context: string): void {
        this.context = context
    }

    public isLevelEnabled(level: LogLevel): boolean {
        return isLogLevelEnabled(level, logLevels)
    }

    private write(level: LogLevel, message: string | Error, options?: LogDetails): void {
        if (!this.isLevelEnabled(level)) {
            return
        }

        const logMessage = message instanceof Error ? message.message : message
        const context = options?.context ?? this.context
        const stackTrace = options?.stackTrace
        const correlationId = this.cls?.getId()

        if (this.isJsonEnabled) {
            this.writeJson(level, logMessage, context, stackTrace, correlationId)
            return
        }

        const formattedMessage = `${this.formatMessage(level, context)}${logMessage}`
        const output = formattedMessage
        //const output = this.colorize(level, formattedMessage)

        switch (level) {
            case LogLevel.Error:
            case LogLevel.Fatal:
                console.error(output)
                if (stackTrace) {
                    console.error(stackTrace)
                }
                break

            case LogLevel.Warn:
                console.warn(output)
                break

            case LogLevel.Debug:
            case LogLevel.Verbose:
                console.debug(output)
                break

            case LogLevel.Log:
            default:
                console.log(output)
                break
        }
    }

    private writeJson(
        level: LogLevel,
        message: string,
        context?: string,
        stackTrace?: string,
        correlationId?: string
    ): void {
        const payload = {
            timestamp: new Date().toISOString(),
            appName,
            level,
            context,
            correlationId,
            message,
            stackTrace,
        }

        const json = JSON.stringify(payload)

        switch (level) {
            case LogLevel.Error:
            case LogLevel.Fatal:
                console.error(json)
                break

            case LogLevel.Warn:
                console.warn(json)
                break

            case LogLevel.Debug:
            case LogLevel.Verbose:
                console.debug(json)
                break

            case LogLevel.Log:
            default:
                console.log(json)
                break
        }
    }

    private formatMessage(level: LogLevel, context?: string): string {
        let prefix = ''

        if (context) {
            prefix += (prefix ? ':' : '') + context
        }

        const correlationId = this.cls?.getId()
        if (correlationId) {
            prefix += `~${correlationId}`
        }

        if (!prefix) {
            return ''
        }

        const formattedLogLevel = level.charAt(0).toUpperCase() + level.substring(1)
        const timestamp = this.timestampFormatter.format(new Date())

        return `[${this.colors.green(appName ?? '')}]    - ${timestamp} \t${this.colorize(level, formattedLogLevel)} ${this.colors.yellow(`[${prefix}]`)}  `
    }

    private colorize(level: LogLevel, text: string): string {
        switch (level) {
            case LogLevel.Error:
            case LogLevel.Fatal:
                return this.colors.red(text)

            case LogLevel.Warn:
                return this.colors.yellow(text)

            case LogLevel.Debug:
                return this.colors.blue(text)

            case LogLevel.Verbose:
                return this.colors.cyanBright(text)

            case LogLevel.Log:
            default:
                return text
        }
    }

    private colors = {
        red: (text: string) => this.withColor(text, LogColor.RED),
        green: (text: string) => this.withColor(text, LogColor.GREEN),
        yellow: (text: string) => this.withColor(text, LogColor.YELLOW),
        blue: (text: string) => this.withColor(text, LogColor.BLUE),
        magentaBright: (text: string) => this.withColor(text, LogColor.MAGENTA_BRIGHT),
        cyanBright: (text: string) => this.withColor(text, LogColor.CYAN_BRIGHT),
    }

    private withColor(text: string, color: LogColor): string {
        return this.isColorEnabled ? `\u001B[${color}m${text}\u001B[39m` : text
    }
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggingProvider {
    private targets: LogTarget[] = []
    private loggers: IAppLogger[]

    constructor(
        @Inject(ClsService) cls: ClsService | undefined,
        @Inject(ConfigRepository) configRepository: ConfigRepository,
        @Inject(ILoggingRepository) loggingRepository: ILoggingRepository
    ) {
        let colorLogs = false
        let logFormat = LogFormat.Console
        const env = configRepository.getEnv()
        this.targets = env.logger.targets

        // logLevels is a module-level threshold shared by every LoggingProvider instance
        // (transient-scoped), so setting it here keeps it in sync with config without
        // requiring callers to resolve a transient instance just to configure it.
        this.setLogLevel(env.logger.logLevel)

        this.loggers = []

        if (this.targets.includes(LogTarget.Console)) {
            colorLogs = env.logger.colorLogs
            logFormat = env.logger.logFormat ?? logFormat

            this.loggers.push(
                new ConsoleLogger(cls, {
                    context: LoggingProvider.name,
                    json: logFormat === LogFormat.Json,
                    color: colorLogs,
                })
            )
        }

        if (this.targets.includes(LogTarget.Database)) {
            this.loggers.push(new DatabaseLogger(loggingRepository, cls, { context: LoggingProvider.name }))
        }
    }

    // static create(context?: string) {
    //     const logger = new LoggingRepository(undefined, undefined)
    //     if (context) {
    //         logger.setContext(context)
    //     }

    //     return logger
    // }

    setAppName(name: string): void {
        appName = name.charAt(0).toUpperCase() + name.slice(1)
    }

    setContext(context: string): void {
        for (const logger of this.loggers) {
            logger.setContext(context)
        }
    }

    isLevelEnabled(level: LogLevel, logTarget?: LogTarget) {
        if (logTarget) {
            return this.loggers.some((logger) => logger.target === logTarget && logger.isLevelEnabled(level))
        }

        return this.loggers.some((logger) => logger.isLevelEnabled(level))
    }

    setLogLevel(level: LogLevel | false): void {
        if (!level) {
            logLevels = []
            return
        }

        const index = LOG_LEVELS.indexOf(level)
        logLevels = index >= 0 ? LOG_LEVELS.slice(index) : []
    }

    getLogLevel(): LogLevel {
        return logLevels[0] || LogLevel.Fatal
    }

    verbose(message: string, details?: LogDetails) {
        const targets = details?.targets ?? this.targets
        this.handleMessage(LogLevel.Verbose, targets, message, details)
    }

    verboseFn(message: LogFunction, details?: LogDetails) {
        const targets = details?.targets ?? this.targets
        this.handleFunction(LogLevel.Verbose, targets, message, details)
    }

    debug(message: string, details?: LogDetails) {
        const targets = details?.targets ?? this.targets
        this.handleMessage(LogLevel.Debug, targets, message, details)
    }

    debugFn(message: LogFunction, details?: LogDetails) {
        const targets = details?.targets ?? this.targets
        this.handleFunction(LogLevel.Debug, targets, message, details)
    }

    log(message: string, details?: LogDetails) {
        const targets = details?.targets ?? this.targets
        this.handleMessage(LogLevel.Log, targets, message, details)
    }

    warn(message: string, details?: LogDetails) {
        const targets = details?.targets ?? this.targets
        this.handleMessage(LogLevel.Warn, targets, message, details)
    }

    error(message: string | Error, details?: LogDetails) {
        const targets = details?.targets ?? this.targets
        this.handleMessage(LogLevel.Error, targets, message, details)
    }

    fatal(message: string, details?: LogDetails) {
        const targets = details?.targets ?? this.targets
        this.handleMessage(LogLevel.Fatal, targets, message, details)
    }

    deprecate(message: string, targets: LogTarget[] = this.targets) {
        this.warn(`[Deprecated] ${message}`, { targets: targets })
    }

    private handleFunction(level: LogLevel, targets: LogTarget[], message: LogFunction, details?: LogDetails) {
        let resolvedMessage: string | undefined

        for (const logger of this.loggers) {
            if (!this.shouldWriteToLogger(logger, level, targets)) {
                continue
            }

            resolvedMessage ??= message()
            this.writeToLogger(logger, level, resolvedMessage, details)
        }
    }

    private handleMessage(level: LogLevel, targets: LogTarget[], message: string | Error, details?: LogDetails) {
        for (const logger of this.loggers) {
            if (!this.shouldWriteToLogger(logger, level, targets)) {
                continue
            }

            this.writeToLogger(logger, level, message, details)
        }
    }

    private writeToLogger(logger: IAppLogger, level: LogLevel, message: string | Error, details?: LogDetails): void {
        switch (level) {
            case LogLevel.Verbose:
                logger.verbose(message, details)
                break

            case LogLevel.Debug:
                logger.debug(message, details)
                break

            case LogLevel.Log:
                logger.log(message, details)
                break

            case LogLevel.Warn:
                logger.warn(message, details)
                break

            case LogLevel.Error:
                logger.error(message, details)
                break

            case LogLevel.Fatal:
                logger.fatal(message, details)
                break
        }
    }

    private shouldWriteToLogger(logger: IAppLogger, level: LogLevel, targets: LogTarget[]): boolean {
        return targets.includes(logger.target) && logger.isLevelEnabled(level)
    }
}
