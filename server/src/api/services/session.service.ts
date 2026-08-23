import { Injectable, Inject } from '@nestjs/common'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { IUserRepository } from '@/data/repositories/IUserRepository'
import { IOAuthProviderRepository } from '@/data/repositories/IOAuthProviderRepository'
import { ISystemMetadataRepository } from '@/data/repositories/ISystemMetadataRepository'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { AdminSessionResponseDto, SessionConfigResponseDto, UpdateSessionConfigDto } from '@/types/dtos/sessionDto'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'
import { SystemConfigKey } from '@/types/models/SystemConfig'

@Injectable()
export class SessionService extends BaseService {
    constructor(
        @Inject(ISessionRepository) private readonly sessionRepository: ISessionRepository,
        @Inject(IUserRepository) private readonly userRepository: IUserRepository,
        @Inject(IOAuthProviderRepository) private readonly oauthProviderRepository: IOAuthProviderRepository,
        @Inject(ISystemMetadataRepository) private readonly systemMetadataRepository: ISystemMetadataRepository,
        @Inject(LoggingProvider) logger: LoggingProvider
    ) {
        super(logger)
    }

    async list(take: number = 50, skip: number = 0): Promise<PaginatedResponseDto<AdminSessionResponseDto>> {
        const sessions = await this.sessionRepository.findMany({}, take, skip)
        const total = await this.sessionRepository.count()

        const userIds = [...new Set(sessions.map((s) => s.userId).filter((id): id is string => id != null))]
        const providerIds = [
            ...new Set(
                sessions
                    .map((s) => (s.data as { authProviderId?: number } | null)?.authProviderId)
                    .filter((id): id is number => id != null)
            ),
        ]

        const [users, providers] = await Promise.all([
            Promise.all(userIds.map((id) => this.userRepository.findById(id))),
            Promise.all(providerIds.map((id) => this.oauthProviderRepository.findById(id))),
        ])

        const usernameById = new Map(users.filter((u) => u != null).map((u) => [u!.id, u!.username]))
        const providerNameById = new Map(providers.filter((p) => p != null).map((p) => [p!.id, p!.name]))

        const data: AdminSessionResponseDto[] = sessions.map((s) => ({
            id: s.id,
            userId: s.userId,
            username: s.userId != null ? (usernameById.get(s.userId) ?? null) : null,
            provider:
                (s.data as { authProviderId?: number } | null)?.authProviderId != null
                    ? (providerNameById.get((s.data as { authProviderId: number }).authProviderId) ?? null)
                    : null,
            ipAddress: s.ipAddress,
            device: s.device,
            browser: s.browser,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
        }))

        return new PaginatedResponseDto(data, total, skip)
    }

    async revoke(id: string): Promise<void> {
        const session = await this.sessionRepository.findByRecordId(id)
        if (session) {
            await this.sessionRepository.delete(session.sid)
            this.logger.log(`Session ${id} revoked`)
        }
    }

    async findById(id: string): Promise<AdminSessionResponseDto | null> {
        const session = await this.sessionRepository.findByRecordId(id)
        if (!session) return null
        return {
            id: session.id,
            userId: session.userId,
            username: null,
            provider: null,
            ipAddress: session.ipAddress,
            device: session.device,
            browser: session.browser,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
        }
    }

    /**
     * Enforces the per-user session limit by evicting the oldest sessions once the user
     * is at or over the configured maximum. Called before a new login session is created.
     */
    async enforceLimitForUser(userId: string): Promise<void> {
        const config = await this.systemMetadataRepository.get(SystemConfigKey.SESSIONS)
        const maxPerUser = config.maxPerUser

        const sessions = await this.sessionRepository.findByUserId(userId)
        const active = sessions
            .filter((s) => s.expiresAt.getTime() > Date.now())
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

        // One new session is about to be created, so evict down to max - 1.
        const evictCount = active.length - (maxPerUser - 1)
        if (evictCount <= 0) return

        for (const session of active.slice(0, evictCount)) {
            await this.sessionRepository.delete(session.sid)
        }

        this.logger.log(`Evicted ${evictCount} session(s) for user ${userId} to enforce limit of ${maxPerUser}`)
    }

    async getConfig(): Promise<SessionConfigResponseDto> {
        const config = await this.systemMetadataRepository.get(SystemConfigKey.SESSIONS)
        return { maxPerUser: config.maxPerUser }
    }

    async updateConfig(dto: UpdateSessionConfigDto): Promise<SessionConfigResponseDto> {
        await this.systemMetadataRepository.set(SystemConfigKey.SESSIONS, { maxPerUser: dto.maxPerUser })
        this.logger.log(`Session config updated: maxPerUser=${dto.maxPerUser}`)
        return { maxPerUser: dto.maxPerUser }
    }

    async purgeExpired(): Promise<boolean> {
        const deleted = await this.sessionRepository.deleteExpired(new Date())
        if (deleted > 0) {
            this.logger.log(`Purged ${deleted} expired session(s)`)
        }
        return true
    }
}
