import { ApplicationClientNames } from '@/types/enums'
import {
    ApplicationUserModel,
    FilterApplicationUserParam,
    ApplicationUserRequirements,
    CreateApplicationUserParam,
    GetApplicationUserResult,
    CreateApplicationUserResult,
} from '@/types/params/application.client'

export interface IApplicationManager {
    name: ApplicationClientNames
    requiredInputs: ApplicationUserRequirements

    onDisable?(): Promise<void>
    onEnable?(): Promise<void>

    getUser(filters: FilterApplicationUserParam): Promise<GetApplicationUserResult>
    getAllUsers(): Promise<ApplicationUserModel[] | null>
    createUser(user: CreateApplicationUserParam): Promise<CreateApplicationUserResult>
    deleteUser(filters: FilterApplicationUserParam): Promise<boolean>
    disableUser(filters: FilterApplicationUserParam): Promise<boolean>
    enableUser(filters: FilterApplicationUserParam): Promise<boolean>
    //updateUser(userServiceAccountId: string) : Promise<ApplicationUserModel | null>
    //updatePassword(userServiceAccountId: string, password: string) : Promise<ApplicationUserModel | null>
}
