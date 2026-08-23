import { Injectable, Inject } from '@nestjs/common'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { IUserRepository } from '@/data/repositories/IUserRepository'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { IUserAccountRepository } from '@/data/repositories/IUserAccountRepository'
import { ILoggingRepository } from '@/data/repositories/ILoggingRepository'
import { ITaskRunRepository } from '@/data/repositories/ITaskRunRepository'
import { DashboardStatsResponseDto } from '@/types/dtos/dashboardDto'
import { LogLevel, ScheduledTasks, UserAccountStatus } from '@/types/enums'
import { UserStatus } from '@/types/models/user'

@Injectable()
export class DashboardService extends BaseService {
    constructor(
        @Inject(IUserRepository) private readonly userRepository: IUserRepository,
        @Inject(ISessionRepository) private readonly sessionRepository: ISessionRepository,
        @Inject(IUserAccountRepository) private readonly userAccountRepository: IUserAccountRepository,
        @Inject(ILoggingRepository) private readonly loggingRepository: ILoggingRepository,
        @Inject(ITaskRunRepository) private readonly taskRunRepository: ITaskRunRepository,
        @Inject(LoggingProvider) logger: LoggingProvider
    ) {
        super(logger)
    }

    async getStats(): Promise<DashboardStatsResponseDto> {
        const now = new Date()

        const [userStats, sessions, totalSubs, activeSubs, recentErrors, lastRuns] = await Promise.all([
            this.userRepository.getUserCounts(),
            this.sessionRepository.findMany({}),
            this.userAccountRepository.count(),
            this.userAccountRepository.count({ statuses: [UserAccountStatus.active] }),
            this.loggingRepository.findMany({ logLevel: LogLevel.Error }, 5, 0),
            Promise.all(Object.values(ScheduledTasks).map((name) => this.taskRunRepository.findLatest(name))),
        ])

        const countByStatus = (status: UserStatus) => userStats.find((s) => s.status === status)?.count ?? 0

        return {
            users: {
                total: userStats.reduce((sum, s) => sum + s.count, 0),
                active: countByStatus(UserStatus.ACTIVE),
                pending: countByStatus(UserStatus.PENDING),
                disabled: countByStatus(UserStatus.DISABLED),
            },
            sessions: {
                active: sessions.filter((s) => s.expiresAt.getTime() > now.getTime()).length,
                expired: sessions.filter((s) => s.expiresAt.getTime() <= now.getTime()).length,
            },
            subscriptions: {
                total: totalSubs,
                active: activeSubs,
            },
            tasks: {
                total: Object.values(ScheduledTasks).length,
                failing: lastRuns.filter((run) => run != null && !run.success).length,
            },
            recentErrors: recentErrors.map((log) => ({
                id: log.id,
                message: log.message,
                context: log.context,
                createdAt: log.createdAt,
            })),
        }
    }
}
