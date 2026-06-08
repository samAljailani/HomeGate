import { ApplicationClientNames } from '@/types/enums'
import { ApplicationUserModel, CreateApplicationUserParam } from '@/types/params/application.client'

export interface IApplicationClient {
    name: ApplicationClientNames

    onDisable?(): Promise<void>
    onEnable?(): Promise<void>

    getUser(userServiceAccountId: string): Promise<ApplicationUserModel | null>
    getAllUsers(): Promise<ApplicationUserModel[] | null>
    createUser(user: CreateApplicationUserParam): Promise<ApplicationUserModel | null>
    deleteUser(userServiceAccountId: string): Promise<boolean>
    disableUser(userServiceAccountId: string): Promise<boolean>
    enableUser(userServiceAccountId: string): Promise<boolean>
    //updateUser(userServiceAccountId: string) : Promise<ApplicationUserModel | null>
    //updatePassword(userServiceAccountId: string, password: string) : Promise<ApplicationUserModel | null>
}
