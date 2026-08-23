import { Injectable, Inject } from '@nestjs/common'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { BaseRepository } from './base.repository'
import { IInviteRepository } from './IInviteRepository'
import { CreateInviteAccountModel, CreateInviteModel, InviteModel, InviteRevokedReason, UpdateInviteModel } from '@/types/models/invite'
import { mapPrismaError } from './util'
import { repositoryErrorMessages } from './resources'

type InviteWithAccounts = {
    id: string
    token: string
    email: string | null
    isAdmin: boolean
    expiresAt: Date
    createdAt: Date
    usedAt: Date | null
    revokedAt: Date | null
    revokedReason: string | null
    failedAttempts: number
    createdByUserId: string | null
    usedByUserId: string | null
    revokedByUserId: string | null
    createdBy: { username: string } | null
    usedBy: { username: string } | null
    revokedBy: { username: string } | null
    accounts: { id: string; inviteId: string; serviceId: number; username: string | null; email: string | null; accountId: string | null; service: { name: string } }[]
}

const includeRelations = {
    accounts: { include: { service: { select: { name: true } } } },
    createdBy: { select: { username: true } },
    usedBy: { select: { username: true } },
    revokedBy: { select: { username: true } },
} as const

@Injectable()
export class InviteRepository extends BaseRepository implements IInviteRepository {
    constructor(@Inject(PrismaProvider) db: PrismaProvider, @Inject(LoggingProvider) logger: LoggingProvider) {
        super(db, logger)
    }

    private mapInvite(invite: InviteWithAccounts): InviteModel {
        return {
            id: invite.id,
            token: invite.token,
            email: invite.email,
            isAdmin: invite.isAdmin,
            expiresAt: invite.expiresAt,
            createdAt: invite.createdAt,
            usedAt: invite.usedAt,
            revokedAt: invite.revokedAt,
            revokedReason: invite.revokedReason as InviteRevokedReason | null,
            failedAttempts: invite.failedAttempts,
            createdByUserId: invite.createdByUserId,
            usedByUserId: invite.usedByUserId,
            revokedByUserId: invite.revokedByUserId,
            createdByUsername: invite.createdBy?.username ?? null,
            usedByUsername: invite.usedBy?.username ?? null,
            revokedByUsername: invite.revokedBy?.username ?? null,
            accounts: invite.accounts.map((a) => ({
                id: a.id,
                inviteId: a.inviteId,
                serviceId: a.serviceId,
                serviceName: a.service.name,
                username: a.username,
                email: a.email,
                accountId: a.accountId,
            })),
        }
    }

    async findById(id: string): Promise<InviteModel | null> {
        try {
            const invite = await this.db.invite.findUnique({ where: { id }, include: includeRelations })
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
            const invite = await this.db.invite.findUnique({ where: { token }, include: includeRelations })
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
                include: includeRelations,
            })
            return invite ? this.mapInvite(invite) : null
        } catch (error) {
            this.logger.error(`findActivePendingByEmail failed`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async create(request: CreateInviteModel, accounts?: CreateInviteAccountModel[]): Promise<InviteModel> {
        try {
            const data: Parameters<typeof this.db.invite.create>[0]['data'] = { ...request }
            if (accounts?.length) {
                data.accounts = { create: accounts }
            }
            const invite = await this.db.invite.create({
                data,
                include: includeRelations,
            })
            return this.mapInvite(invite)
        } catch (error) {
            this.logger.error(`create failed`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async update(id: string, data: UpdateInviteModel): Promise<InviteModel | null> {
        try {
            const invite = await this.db.invite.update({
                where: { id },
                data,
                include: includeRelations,
            })
            return this.mapInvite(invite)
        } catch (error) {
            this.logger.error(`update failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await this.db.invite.delete({ where: { id } })
        } catch (error) {
            this.logger.error(`delete failed for id: ${id}`, {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async claim(id: string, usedByUserId: string): Promise<InviteModel | null> {
        try {
            const result = await this.db.invite.updateMany({
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

            const invite = await this.db.invite.findUnique({ where: { id }, include: includeRelations })
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
        revokedByUserId?: string | null
    ): Promise<InviteModel | null> {
        try {
            const invite = await this.db.invite.update({
                where: { id },
                data: { revokedAt: new Date(), revokedReason: reason, revokedByUserId: revokedByUserId ?? null },
                include: includeRelations,
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
            const invites = await this.db.invite.findMany({ orderBy: { createdAt: 'desc' }, take, skip, include: includeRelations })
            return invites.map((invite) => this.mapInvite(invite))
        } catch (error) {
            this.logger.error('findAll failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }

    async count(): Promise<number> {
        try {
            return await this.db.invite.count()
        } catch (error) {
            this.logger.error('count failed', {
                stackTrace: error instanceof Error ? error.stack : undefined,
            })
            mapPrismaError(error, repositoryErrorMessages.invite)
        }
    }
}
