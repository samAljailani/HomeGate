import { CreateInviteModel, InviteModel, InviteRevokedReason } from '@/types/models/invite'

export const IInviteRepository = Symbol('IInviteRepository')

export interface IInviteRepository {
    findById(id: string): Promise<InviteModel | null>
    findByToken(token: string): Promise<InviteModel | null>
    findActivePendingByEmail(email: string): Promise<InviteModel | null>
    findAll(take?: number, skip?: number): Promise<InviteModel[]>
    create(request: CreateInviteModel): Promise<InviteModel>
    /**
     * Atomically claim a pending invite for a user. The update only applies when the
     * invite is still pending (not used, not revoked, not expired), which prevents a
     * double-spend race. Returns the claimed invite, or null if it was no longer pending.
     */
    claim(id: string, usedByUserId: string): Promise<InviteModel | null>
    incrementFailedAttempts(id: string): Promise<number>
    revoke(id: string, reason: InviteRevokedReason, revokedByUserId?: string | null): Promise<InviteModel | null>
}
