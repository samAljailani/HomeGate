import { UserAccount } from '@prisma/generated'

import {
    UserAccountCreateRequestDto,
    UserAccountDeleteRequestDto,
    UserAccountFilterOptions,
    UserAccountLoadRequestDto,
    UserAccountUpdateRequestDto,
} from '@/types/dtos/userAccountDto'

export const IUserAccountRepository = Symbol('IUserAccountRepository')

export interface IUserAccountRepository {
    get(request: UserAccountLoadRequestDto): Promise<UserAccount | null>
    getMany(filter: UserAccountFilterOptions): Promise<UserAccount[]>
    post(request: UserAccountCreateRequestDto): Promise<UserAccount | null>
    put(request: UserAccountUpdateRequestDto): Promise<UserAccount | null>
    delete(request: UserAccountDeleteRequestDto): Promise<void>
}
