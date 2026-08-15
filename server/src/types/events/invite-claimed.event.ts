import { InviteAccountModel } from '@/types/models/invite'

export type InviteClaimedEvent = {
    readonly userId: string
    readonly username: string
    readonly accounts: InviteAccountModel[]
}
