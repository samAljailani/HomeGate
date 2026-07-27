import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { IInviteRepository } from './IInviteRepository'
import type { InviteModel as PrismaInvite } from '@prisma/generated/models'
import { InviteRevokedReason, Prisma } from '@prisma/generated'
import { CreateInviteModel, InviteModel } from '@/types/models/invite'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'

@Injectable()
export class InviteRepository extends BaseRepository implements IInviteRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapInvite(invite: PrismaInvite): InviteModel {
        return {
            id: invite.id,
            token: invite.token,
            email: invite.email,
            expiresAt: invite.expiresAt,
            createdAt: invite.createdAt,
            usedAt: invite.usedAt,
            revokedAt: invite.revokedAt,
            revokedReason: invite.revokedReason,
            failedAttempts: invite.failedAttempts,
            createdByUserId: invite.createdByUserId,
            usedByUserId: invite.usedByUserId,
            revokedByUserId: invite.revokedByUserId,
        }
    }

    async findById(id: string): Promise<InviteModel | null> {
        try {
            const invite = await this.db.invite.findUnique({ where: { id } })
            return invite ? this.mapInvite(invite) : null
        } catch (error) {
            this.logger.error(`findById failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async findByToken(token: string): Promise<InviteModel | null> {
        try {
            const invite = await this.db.invite.findUnique({ where: { token } })
            return invite ? this.mapInvite(invite) : null
        } catch (error) {
            this.logger.error(`findByToken failed`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async findActivePendingByEmail(email: string): Promise<InviteModel | null> {
        try {
            const invite = await this.db.invite.findFirst({
                where: {
                    email,
                    usedAt: null,
                    revokedAt: null,
                    expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: 'desc' },
            })
            return invite ? this.mapInvite(invite) : null
        } catch (error) {
            this.logger.error(`findActivePendingByEmail failed`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async create(request: CreateInviteModel): Promise<InviteModel> {
        try {
            const invite = await this.db.invite.create({ data: request })
            return this.mapInvite(invite)
        } catch (error) {
            this.logger.error(`create failed`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async claim(id: string, usedByUserId: string, tx?: Prisma.TransactionClient): Promise<InviteModel | null> {
        const client = tx ?? this.db
        try {
            const result = await client.invite.updateMany({
                where: {
                    id,
                    usedAt: null,
                    revokedAt: null,
                    expiresAt: { gt: new Date() },
                },
                data: { usedByUserId, usedAt: new Date() },
            })

            if (result.count === 0) {
                return null
            }

            const invite = await client.invite.findUnique({ where: { id } })
            return invite ? this.mapInvite(invite) : null
        } catch (error) {
            this.logger.error(`claim failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async incrementFailedAttempts(id: string): Promise<number> {
        try {
            const invite = await this.db.invite.update({
                where: { id },
                data: { failedAttempts: { increment: 1 } },
            })
            return invite.failedAttempts
        } catch (error) {
            this.logger.error(`incrementFailedAttempts failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async revoke(
        id: string,
        reason: InviteRevokedReason,
        revokedByUserId?: string | null,
        tx?: Prisma.TransactionClient
    ): Promise<InviteModel | null> {
        const client = tx ?? this.db
        try {
            const invite = await client.invite.update({
                where: { id },
                data: { revokedAt: new Date(), revokedReason: reason, revokedByUserId: revokedByUserId ?? null },
            })
            return this.mapInvite(invite)
        } catch (error) {
            this.logger.error(`revoke failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async findAll(take: number = 50, skip: number = 0): Promise<InviteModel[]> {
        try {
            const invites = await this.db.invite.findMany({ orderBy: { createdAt: 'desc' }, take, skip })
            return invites.map((invite) => this.mapInvite(invite))
        } catch (error) {
            this.logger.error('findAll failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }
}
