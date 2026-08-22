import { CreateUserModel, UpdateUserModel, UserModel, UserFilterOptions, UserStatusCountModel, UserStatus } from '@/types/models/user'

export const IUserRepository = Symbol('IUserRepository')

export interface IUserRepository {
    findById(id: string): Promise<UserModel | null>
    findByEmail(email: string): Promise<UserModel | null>
    findMany(filter: UserFilterOptions, take?: number, skip?: number): Promise<UserModel[]>
    count(filter: UserFilterOptions): Promise<number>
    getUserCounts(userStatuses?: UserStatus[]): Promise<UserStatusCountModel[]>
    create(request: CreateUserModel): Promise<UserModel | null>
    createProvisional(request: CreateUserModel): Promise<UserModel>
    touchProvisional(id: string): Promise<void>
    activate(id: string): Promise<UserModel>
    findPendingByEmail(email: string): Promise<UserModel | null>
    deletePendingOlderThan(cutoff: Date): Promise<number>
    createWithOAuthIdentity(request: CreateUserModel, providerId: number, profileId: string): Promise<UserModel>
    update(request: UpdateUserModel): Promise<UserModel | null>
    usernameExists(username: string): Promise<boolean>
    softDelete(id: string): Promise<boolean>
    hardDelete(id: string): Promise<boolean>
    setEnabled(id: string, enabled: boolean): Promise<UserModel | null>
    setAdmin(id: string, isAdmin: boolean): Promise<UserModel | null>
}
