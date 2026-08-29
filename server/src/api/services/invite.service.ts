import {
    Injectable,
    Inject,
    BadRequestException,
    NotFoundException,
    UnprocessableEntityException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common'
import { IInviteRepository, IServiceRepository } from '@/data/repositories'
import { CreateInviteAccountModel, InviteModel, InviteRevokedReason, UpdateInviteModel } from '@/types/models/invite'
import {
    CreateInviteRequestDto,
    CreateInviteResponseDto,
    InvitePatchRequestDto,
    InviteResponseDto,
} from '@/types/dtos/inviteDto'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { UserService } from './user.service'
import { UserModel, UserStatus } from '@/types/models/user'
import { IntegrationProvider } from '@/types/enums'
import { MAX_INVITE_FAILED_ATTEMPTS } from '@/types/invite.constants'

@Injectable()
export class InviteService extends BaseService {
    constructor(
        @Inject(IInviteRepository) private inviteRepository: IInviteRepository,
        @Inject(IServiceRepository) private serviceRepository: IServiceRepository,
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
            isAdmin: invite.isAdmin,
            expiresAt: invite.expiresAt,
            createdAt: invite.createdAt,
            usedAt: invite.usedAt,
            revokedAt: invite.revokedAt,
            revokedReason: invite.revokedReason,
            createdByUsername: invite.createdByUsername,
            usedByUsername: invite.usedByUsername,
            revokedByUsername: invite.revokedByUsername,
            accounts: invite.accounts.map((a) => ({
                serviceName: a.serviceName,
                username: a.username,
                email: a.email,
                accountId: a.accountId,
            })),
        }
    }

    async createToken(options: CreateInviteRequestDto, createdByUserId: string): Promise<CreateInviteResponseDto> {
        let accounts: CreateInviteAccountModel[] | undefined
        if (options.accounts?.length) {
            this.validateUniqueServices(options.accounts)
            this.validateAccountEmails(options.accounts, options.email)
            accounts = await this.resolveAccounts(options.accounts)
        }

        if (options.email != null) {
            await this.supersedePendingInvite(options.email)
        }

        const rawToken = this.cryptography.GenerateRandomToken(4).toUpperCase()
        const token = this.hashToken(rawToken)

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + options.expiresInDays)

        const invite = await this.inviteRepository.create(
            {
                token,
                email: options.email ?? null,
                isAdmin: options.isAdmin ?? false,
                expiresAt,
                createdByUserId,
            },
            accounts
        )

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

    async revokeToken(id: string, revokedByUserId: string): Promise<InviteResponseDto> {
        const invite = await this.inviteRepository.findById(id)

        if (invite == null) {
            throw new NotFoundException('Invite not found.')
        }

        if (invite.usedAt != null) {
            throw new ConflictException('Cannot revoke an invite that has already been used.')
        }

        if (invite.revokedAt != null || invite.expiresAt < new Date()) {
            return this.mapInvite(invite)
        }

        const revoked = await this.inviteRepository.revoke(id, InviteRevokedReason.ADMIN, revokedByUserId)

        this.logger.log(`Invite ${id} revoked by user ${revokedByUserId}`)

        return this.mapInvite(revoked ?? invite)
    }

    async updateInvite(id: string, request: InvitePatchRequestDto, userId: string): Promise<InviteResponseDto> {
        const invite = await this.inviteRepository.findById(id)

        if (invite == null) {
            throw new NotFoundException('Invite not found.')
        }

        if (invite.usedAt != null) {
            throw new UnprocessableEntityException('Cannot update an invite that has already been used.')
        }

        if (invite.revokedAt != null) {
            throw new UnprocessableEntityException('Cannot update a revoked invite.')
        }

        const updateData: UpdateInviteModel = {}
        if (request.email !== undefined) updateData.email = request.email
        if (request.expiresAt !== undefined) updateData.expiresAt = request.expiresAt
        if (request.isAdmin !== undefined) updateData.isAdmin = request.isAdmin
        if (request.revoked === true) {
            updateData.revokedAt = new Date()
            updateData.revokedReason = InviteRevokedReason.ADMIN
            updateData.revokedByUserId = userId
        }

        if (Object.keys(updateData).length === 0) {
            return this.mapInvite(invite)
        }

        const updated = await this.inviteRepository.update(id, updateData)

        if (request.revoked === true) {
            this.logger.log(`Invite ${id} revoked by user ${userId}`)
        }

        this.logger.log(`Invite ${id} updated by user ${userId}`)

        return this.mapInvite(updated ?? invite)
    }

    /**
     * Atomically claim a validated invite for a user. The repository guards against a
     * double-spend race and returns null if the invite is no longer pending.
     */
    async claimToken(inviteId: string, userId: string): Promise<InviteModel> {
        const claimed = await this.inviteRepository.claim(inviteId, userId)

        if (claimed == null) {
            throw new ConflictException('Invite token has already been used.')
        }

        this.logger.log(`Invite ${inviteId} claimed by user ${userId}`)

        return claimed
    }

    async deleteInvite(id: string): Promise<void> {
        const invite = await this.inviteRepository.findById(id)

        if (invite == null) {
            throw new NotFoundException('Invite not found.')
        }

        await this.inviteRepository.delete(id)
        this.logger.log(`Invite ${id} deleted`)
    }

    async listInvites(take: number = 50, skip: number = 0): Promise<PaginatedResponseDto<InviteResponseDto>> {
        const [invites, total] = await Promise.all([
            this.inviteRepository.findAll(take, skip),
            this.inviteRepository.count(),
        ])
        return new PaginatedResponseDto(invites.map((invite) => this.mapInvite(invite)), total, skip)
    }

    private async supersedePendingInvite(email: string): Promise<void> {
        const existingUser = await this.userService.getUserByEmail(email)

        if (existingUser != null && existingUser.status !== UserStatus.PENDING) {
            throw new ConflictException('An account with this email already exists.')
        }

        const existingInvite = await this.inviteRepository.findActivePendingByEmail(email)

        if (existingInvite != null) {
            await this.inviteRepository.revoke(existingInvite.id, InviteRevokedReason.AUTO_SUPERSEDED, null)
            this.logger.log(`Invite ${existingInvite.id} superseded by a new invite for the same email`)
        }
    }

    public getInviteUserOverrides(invite: InviteModel): Partial<UserModel> {
        return {
            ...(invite.email != null && {email: invite.email}),
            isAdmin: invite.isAdmin,
        }
    }   

    private validateUniqueServices(accounts: CreateInviteRequestDto['accounts'] & object): void {
        const seen = new Set<string>()
        for (const account of accounts) {
            const key = account.serviceName.toLowerCase()
            if (seen.has(key)) {
                throw new BadRequestException(`Duplicate service '${account.serviceName}' in linked accounts.`)
            }
            seen.add(key)
        }
    }

    private validateAccountEmails(accounts: CreateInviteRequestDto['accounts'] & object, inviteEmail?: string): void {
        const accountWithEmail = accounts.find((a) => a.email != null)
        if (accountWithEmail?.email == null || accountWithEmail?.email == "") return

        if (inviteEmail == null) {
            throw new BadRequestException('Invite must have a bound email when an account email is provided.')
        }
        if (accountWithEmail.email.toLowerCase() !== inviteEmail.toLowerCase()) {
            throw new BadRequestException('Account email must match the invite bound email.')
        }
    }

    private async resolveAccounts(accounts: CreateInviteRequestDto['accounts'] & object): Promise<CreateInviteAccountModel[]> {
        const resolved: CreateInviteAccountModel[] = []
        for (const account of accounts) {
            const serviceName = Object.values(IntegrationProvider).find(
                (v) => v === account.serviceName.toLowerCase()
            ) as IntegrationProvider | undefined
            if (serviceName == null) {
                throw new BadRequestException(`Service '${account.serviceName}' is not a valid service name.`)
            }
            const service = await this.serviceRepository.findByName(serviceName)
            if (service == null) {
                throw new BadRequestException(`Service '${account.serviceName}' not found.`)
            }
            const entry: CreateInviteAccountModel = { serviceId: service.id }
            if (account.username != null) entry.username = account.username
            if (account.email != null) entry.email = account.email
            if (account.accountId != null) entry.accountId = account.accountId
            resolved.push(entry)
        }
        return resolved
    }
}
