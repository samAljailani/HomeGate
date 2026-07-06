import { CreateInviteModel, InviteModel } from '@/types/models/invite'

export const IInviteRepository = Symbol('IInviteRepository')

export interface IInviteRepository {
    findById(id: string): Promise<InviteModel | null>
    findByToken(token: string): Promise<InviteModel | null>
    findAll(take?: number, skip?: number): Promise<InviteModel[]>
    create(request: CreateInviteModel): Promise<InviteModel>
    markUsed(id: string, usedByUserId: string): Promise<InviteModel | null>
    revoke(id: string): Promise<InviteModel | null>
}
