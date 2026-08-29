import { IntegrationProvider } from '@/types/enums'
import {
    ApplicationUserModel,
    FilterApplicationUserParam,
    ApplicationUserRequirements,
    CreateApplicationUserParam,
    GetApplicationUserResult,
    CreateApplicationUserResult,
} from '@/types/params/accountIntegration'

export interface IAccountIntegrationProvider {
    name: IntegrationProvider
    requiredInputs: ApplicationUserRequirements

    onDisable?(): Promise<void>
    onEnable?(): Promise<void>

    getUser(filters: FilterApplicationUserParam): Promise<GetApplicationUserResult>
    getAllUsers(): Promise<ApplicationUserModel[] | null>
    createUser(user: CreateApplicationUserParam): Promise<CreateApplicationUserResult>
    deleteUser(filters: FilterApplicationUserParam): Promise<boolean>
    disableUser(filters: FilterApplicationUserParam): Promise<boolean>
    enableUser(filters: FilterApplicationUserParam): Promise<boolean>
    /** Resets the service account password using the configured admin API key. Clients resolve the account from whichever filter fields are set. */
    resetPassword(filters: FilterApplicationUserParam, newPassword: string): Promise<boolean>
    //updateUser(userServiceAccountId: string) : Promise<ApplicationUserModel | null>
    //updatePassword(userServiceAccountId: string, password: string) : Promise<ApplicationUserModel | null>
}
