import {
    Injectable,
    Inject,
    NotFoundException,
    UnprocessableEntityException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common'
import { IInviteRepository } from '@/data/repositories'
import { InviteModel } from '@/types/models/invite'
import { CreateInviteRequestDto, CreateInviteResponseDto, InviteResponseDto } from '@/types/dtos/inviteDto'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Injectable()
export class InviteService extends BaseService {
    constructor(
        @Inject(IInviteRepository) private inviteRepository: IInviteRepository,
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(CryptographyProvider) private cryptography: CryptographyProvider
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
            createdByUserId: invite.createdByUserId,
            usedByUserId: invite.usedByUserId,
        }
    }

    async createToken(options: CreateInviteRequestDto, createdByUserId: string): Promise<CreateInviteResponseDto> {
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

        console.log('========================================================')
        console.log(`request: ${email}`)
        console.log(`invite ${invite.email}`)
        console.log('========================================================')

        if (email != null && invite.email != null && invite.email !== email) {
            throw new ForbiddenException('Invite token is not valid for this account.')
        }

        return invite
    }

    async revokeToken(id: string): Promise<void> {
        const invite = await this.inviteRepository.findById(id)

        if (invite == null) {
            throw new NotFoundException('Invite not found.')
        }

        await this.inviteRepository.revoke(id)

        this.logger.log(`Invite ${id} revoked`)
    }

    async useToken(rawToken: string, userId: string): Promise<InviteModel> {
        const invite = await this.validateToken(rawToken)

        const used = await this.inviteRepository.markUsed(invite.id, userId)

        this.logger.log(`Invite ${invite.id} used by user ${userId}`)

        return used!
    }

    async listInvites(take?: number, skip?: number): Promise<InviteResponseDto[]> {
        const invites = await this.inviteRepository.findAll(take, skip)
        return invites.map((invite) => this.mapInvite(invite))
    }
}
