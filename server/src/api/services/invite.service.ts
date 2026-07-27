import {
    Injectable,
    Inject,
    NotFoundException,
    UnprocessableEntityException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common'
import { InviteRevokedReason, Prisma } from '@prisma/generated'
import { IInviteRepository } from '@/data/repositories'
import { InviteModel } from '@/types/models/invite'
import { CreateInviteRequestDto, CreateInviteResponseDto, InviteResponseDto } from '@/types/dtos/inviteDto'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { UserService } from './user.service'
import { MAX_INVITE_FAILED_ATTEMPTS } from '@/types/invite.constants'

@Injectable()
export class InviteService extends BaseService {
    constructor(
        @Inject(IInviteRepository) private inviteRepository: IInviteRepository,
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(CryptographyProvider) private cryptography: CryptographyProvider,
        @Inject(UserService) private userService: UserService
    ) {
        super(logger)
    }

    private hashToken(rawToken: string): string {
        return this.cryptography.HashSha256(rawToken).toString('hex')
    }

    private mapInvite(invite: InviteModel): InviteResponseDto {
        return {
            id: invite.id,
            email: invite.email,
            expiresAt: invite.expiresAt,
            createdAt: invite.createdAt,
            usedAt: invite.usedAt,
            revokedAt: invite.revokedAt,
            revokedReason: invite.revokedReason,
            createdByUserId: invite.createdByUserId,
            usedByUserId: invite.usedByUserId,
            revokedByUserId: invite.revokedByUserId,
        }
    }

    async createToken(options: CreateInviteRequestDto, createdByUserId: string): Promise<CreateInviteResponseDto> {
        if (options.email != null) {
            const existingUser = await this.userService.getUserByEmail(options.email)

            if (existingUser != null) {
                throw new ConflictException('An account with this email already exists.')
            }

            const existingInvite = await this.inviteRepository.findActivePendingByEmail(options.email)

            if (existingInvite != null) {
                await this.inviteRepository.revoke(existingInvite.id, InviteRevokedReason.AUTO_SUPERSEDED, null)
                this.logger.log(`Invite ${existingInvite.id} superseded by a new invite for the same email`)
            }
        }

        const rawToken = this.cryptography.GenerateRandomToken()
        const token = this.hashToken(rawToken)

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + options.expiresInDays)

        const invite = await this.inviteRepository.create({
            token,
            email: options.email ?? null,
            expiresAt,
            createdByUserId,
        })

        this.logger.log(`Invite token created${options.email ? ` for ${options.email}` : ''}`)

        return { rawToken, invite: this.mapInvite(invite) }
    }

    async validateToken(rawToken: string, email?: string): Promise<InviteModel> {
        const token = this.hashToken(rawToken)
        const invite = await this.inviteRepository.findByToken(token)

        if (invite == null) {
            throw new NotFoundException('Invite token not found.')
        }

        if (invite.revokedAt != null) {
            throw new UnprocessableEntityException('Invite token has been revoked.')
        }

        if (invite.usedAt != null) {
            throw new ConflictException('Invite token has already been used.')
        }

        if (invite.expiresAt < new Date()) {
            throw new UnprocessableEntityException('Invite token has expired.')
        }

        if (email != null && invite.email != null && invite.email !== email) {
            const failedAttempts = await this.inviteRepository.incrementFailedAttempts(invite.id)

            if (failedAttempts >= MAX_INVITE_FAILED_ATTEMPTS) {
                await this.inviteRepository.revoke(invite.id, InviteRevokedReason.AUTO_FAILED_ATTEMPTS, null)
                this.logger.warn(
                    `Invite ${invite.id} auto-revoked after ${failedAttempts} failed redemption attempts`
                )
            }

            throw new ForbiddenException('Invite token is not valid for this account.')
        }

        return invite
    }

    async revokeToken(id: string, revokedByUserId: string): Promise<void> {
        const invite = await this.inviteRepository.findById(id)

        if (invite == null) {
            throw new NotFoundException('Invite not found.')
        }

        if (invite.usedAt != null) {
            throw new ConflictException('Cannot revoke an invite that has already been used.')
        }

        if (invite.revokedAt != null || invite.expiresAt < new Date()) {
            // Already terminal (revoked or expired) — revoking is an idempotent no-op.
            return
        }

        await this.inviteRepository.revoke(id, InviteRevokedReason.ADMIN, revokedByUserId)

        this.logger.log(`Invite ${id} revoked by user ${revokedByUserId}`)
    }

    /**
     * Atomically claim a validated invite for a user. Intended to run inside the same
     * transaction that creates the user so consumption and account creation are all-or-nothing.
     * Throws if the invite is no longer pending (lost double-spend race).
     */
    async claimToken(inviteId: string, userId: string, tx?: Prisma.TransactionClient): Promise<InviteModel> {
        const claimed = await this.inviteRepository.claim(inviteId, userId, tx)

        if (claimed == null) {
            throw new ConflictException('Invite token has already been used.')
        }

        this.logger.log(`Invite ${inviteId} claimed by user ${userId}`)

        return claimed
    }

    async listInvites(take?: number, skip?: number): Promise<InviteResponseDto[]> {
        const invites = await this.inviteRepository.findAll(take, skip)
        return invites.map((invite) => this.mapInvite(invite))
    }
}
