import { Inject, Injectable } from '@nestjs/common'
import { IAccountIntegrationProvider } from '../IAccountIntegrationProvider'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ConfigService } from '@/api/services/config.service'
import {
    ApplicationUserModel,
    ApplicationUserRequirements,
    CreateApplicationUserParam,
    CreateApplicationUserResult,
    FilterApplicationUserParam,
    GetApplicationUserResult,
} from '@/types/params/accountIntegration'
import { IntegrationProvider } from '@/types/enums'
import { ImmichUserResponse, CreateImmichUserRequestDto, immichEndpoints } from './immich.types'
import { SystemConfigKey } from '@/types/models/SystemConfig'

@Injectable()
export class ImmichIntegration implements IAccountIntegrationProvider {
    public readonly name = IntegrationProvider.Immich

    public readonly requiredInputs: ApplicationUserRequirements = {
        username: true,
        email: true,
        password: true,
        displayName: false,
    }

    constructor(
        @Inject(LoggingProvider) private logger: LoggingProvider,
        @Inject(ConfigService) private configService: ConfigService
    ) {
        this.logger.setContext(this.constructor.name)
    }

    private get config() {
        return this.configService.get(SystemConfigKey.IMMICH)
    }

    get headers() {
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
        }
    }

    // #region IAccountIntegrationProvider

    async getUser(filters: FilterApplicationUserParam): Promise<GetApplicationUserResult> {
        if (!filters.userServiceAccountId && !filters.email) {
            this.logger.warn('Immich client received a bad get user request')

            return {
                ok: false,
                user: null,
            }
        }

        const user = filters.userServiceAccountId
            ? await this.getUserById(filters.userServiceAccountId)
            : await this.getUserByEmail(filters.email!, true)

        if (!user) {
            return {
                ok: false,
                user: null,
            }
        }

        return {
            ok: true,
            user,
        }
    }

    async getAllUsers(): Promise<ApplicationUserModel[] | null> {
        const url = `${this.config.baseUrl}${immichEndpoints.getAllUsers(JSON.stringify(true))}`

        const requestOptions = {
            method: 'GET',
            headers: this.headers,
        }

        const users: ApplicationUserModel[] = []

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(`Failed to retrieve the list of all Immich users. Status: ${response.status}`)
                return null
            }

            const data = (await response.json()) as ImmichUserResponse[]

            for (const user of data) {
                if (!user.id || (!user.email && !user.name)) {
                    this.logger.error(
                        `Immich returned a user with missing information. user: ${user.name ?? ''} user: ${user.email ?? ''}`
                    )
                    continue
                }

                users.push({
                    id: user.id,
                    username: user.email ?? user.name!,
                    isActive: !user.deletedAt,
                    isAdmin: user.isAdmin === true,
                })
            }
        } catch (error) {
            this.logger.error(`Error retrieving list of all Immich users.`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            return null
        }

        return users
    }

    async createUser(user: CreateApplicationUserParam): Promise<CreateApplicationUserResult> {
        if (!user.email || !user.password) {
            this.logger.error(
                'The Immich client received a bad create user request. Email and password are required inputs'
            )

            return {
                ok: false,
                user: null,
            }
        }

        if (this.config.provisioningMode !== 'local') {
            this.logger.error(
                'The Immich client cannot create local users while in OAuth provisioning mode. Use OAuth auto-registration or identity-provider group access instead.'
            )

            return {
                ok: false,
                user: null,
            }
        }

        const existingUser = await this.getUserByEmail(user.email, false)

        if (existingUser) {
            this.logger.log(`Immich user account already exists: ${user.email}`)

            return {
                ok: false,
                user: existingUser,
            }
        }

        const url = `${this.config.baseUrl}${immichEndpoints.createUser}`

        const body = {
            email: user.email,
            name: user.displayName ?? user.username ?? user.email,
            password: user.password,
        } satisfies CreateImmichUserRequestDto

        const requestOptions = {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        }

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(`Failed to create Immich account. Status code: ${response.status}`)

                return {
                    ok: false,
                    user: null,
                }
            }

            const data = (await response.json()) as ImmichUserResponse

            if (!data.id || (!data.email && !data.name)) {
                this.logger.error(`Unexpected Immich response after user creation: ${JSON.stringify(data)}`)

                return {
                    ok: false,
                    user: null,
                }
            }

            this.logger.log(`Successfully created Immich user account: ${user.email}`)

            return {
                ok: true,
                user: {
                    id: data.id,
                    username: data.email ?? data.name!,
                    isActive: !data.deletedAt,
                    isAdmin: data.isAdmin === true,
                },
            }
        } catch (error) {
            this.logger.error(
                `Error creating Immich user given request: user: ${user.username ?? ''} email: ${user.email ?? ''}`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )

            return {
                ok: false,
                user: null,
            }
        }
    }

    async deleteUser(filters: FilterApplicationUserParam): Promise<boolean> {
        if (filters.userServiceAccountId == null && filters.email == null) {
            this.logger.warn('Immich client received a bad delete user request')
            return false
        }

        let userServiceAccountId: string | null = null

        try {
            const userResult = await this.getUser(filters)

            if (!userResult.ok || !userResult.user) {
                this.logger.warn('Immich client failed to delete user. User was not found')
                return false
            }

            const user = userResult.user

            if (!user.isActive) {
                this.logger.log(`Immich user '${user.id}' is already deleted`)
                return true
            }

            userServiceAccountId = user.id

            const url = `${this.config.baseUrl}${immichEndpoints.deleteUser(encodeURIComponent(userServiceAccountId))}`

            const requestOptions = {
                method: 'DELETE',
                headers: this.headers,
            }

            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(
                    `Failed to delete Immich user with service account id '${userServiceAccountId}'. Status: ${response.status}`
                )

                return false
            }

            return true
        } catch (error) {
            this.logger.error(
                `Error deleting Immich user with service account id '${userServiceAccountId ?? 'unknown'}'.`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )

            return false
        }
    }

    async disableUser(filters: FilterApplicationUserParam): Promise<boolean> {
        // Immich does not expose a normal "disabled" flag.
        // This soft-deletes the user and disables access until restored.
        return this.deleteUser(filters)
    }

    async enableUser(filters: FilterApplicationUserParam): Promise<boolean> {
        if (filters.userServiceAccountId == null && filters.email == null) {
            this.logger.warn('Immich client received a bad enable user request')
            return false
        }

        let userServiceAccountId: string | null = null

        try {
            const userResult = await this.getUser(filters)

            if (!userResult.ok || !userResult.user) {
                this.logger.warn('Immich client failed to enable user. User was not found')
                return false
            }

            const user = userResult.user

            if (user.isActive) {
                this.logger.log(`Immich user '${user.id}' is already active`)
                return true
            }

            userServiceAccountId = user.id

            const url = `${this.config.baseUrl}${immichEndpoints.restoreUser(encodeURIComponent(userServiceAccountId))}`

            const requestOptions = {
                method: 'POST',
                headers: this.headers,
            }

            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(
                    `Failed to restore Immich user with service account id '${userServiceAccountId}'. Status: ${response.status}`
                )

                return false
            }

            this.logger.log(`Successfully restored Immich user '${userServiceAccountId}'`)
            return true
        } catch (error) {
            this.logger.error(
                `Error restoring Immich user with service account id '${userServiceAccountId ?? 'unknown'}'.`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )

            return false
        }
    }

    async resetPassword(filters: FilterApplicationUserParam, newPassword: string): Promise<boolean> {
        if (filters.userServiceAccountId == null && filters.email == null && filters.username == null) {
            this.logger.warn('Immich client received a bad reset password request')
            return false
        }

        const userResult = await this.getUser(filters)
        const userServiceAccountId = userResult.ok && userResult.user ? userResult.user.id : null

        if (userServiceAccountId == null) {
            this.logger.warn('Immich user not found for password reset')
            return false
        }

        // updateUserAdmin accepts a password field and clears the change-on-login flag.
        const url = `${this.config.baseUrl}${immichEndpoints.updateUser(encodeURIComponent(userServiceAccountId))}`

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify({ password: newPassword, shouldChangePassword: false }),
            })

            if (!response.ok) {
                this.logger.error(
                    `Failed to reset Immich password for service account '${userServiceAccountId}'. Status: ${response.status}`
                )
                return false
            }

            return true
        } catch (error) {
            this.logger.error(`Error resetting Immich password for service account '${userServiceAccountId}'.`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })
            return false
        }
    }
    // #endregion

    // #region private methods
    private async getUserById(userServiceAccountId: string): Promise<ApplicationUserModel | null> {
        const url = `${this.config.baseUrl}${immichEndpoints.getUser(encodeURIComponent(userServiceAccountId))}`

        const requestOptions = {
            method: 'GET',
            headers: this.headers,
        }

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(
                    `Failed to retrieve Immich user information with service account id '${userServiceAccountId}'. Status: ${response.status}`
                )

                return null
            }

            const data = (await response.json()) as ImmichUserResponse

            if (!data.id || (!data.email && !data.name)) {
                this.logger.error(`Invalid Immich user response for service account id '${userServiceAccountId}'.`)
                return null
            }

            return {
                id: data.id,
                username: data.email ?? data.name!,
                isActive: !data.deletedAt,
                isAdmin: data.isAdmin === true,
            }
        } catch (error) {
            this.logger.error(
                `Error retrieving Immich user information with service account id '${userServiceAccountId}'.`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )

            return null
        }
    }

    private async getUserByEmail(email: string, withDeleted: boolean): Promise<ApplicationUserModel | null> {
        const url = `${this.config.baseUrl}${immichEndpoints.getAllUsers(String(withDeleted))}`

        const requestOptions = {
            method: 'GET',
            headers: this.headers,
        }

        try {
            const allUsersResponse = await fetch(url, requestOptions)

            if (!allUsersResponse.ok) {
                this.logger.error(`Failed to retrieve list of Immich users'. Status: ${allUsersResponse.status}`)
                return null
            }

            const users = (await allUsersResponse.json()) as ImmichUserResponse[]

            for (const user of users) {
                if (!user.id || (!user.email && !user.name)) {
                    this.logger.error(`Immich api returned an invalid user account`)
                    return null
                }

                if (user.email == email) {
                    return {
                        id: user.id,
                        username: user.email ?? user.name!,
                        isActive: !user.deletedAt,
                        isAdmin: user.isAdmin === true,
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error retrieving Immich user information with email: '${email}'.`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })
        }

        return null
    }
    // #endregion
}
