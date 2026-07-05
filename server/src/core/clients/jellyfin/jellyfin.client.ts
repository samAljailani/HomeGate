import { LoggingProvider } from '@/infrastructure/logger.provider'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigRepository } from '@/data/repositories/config.repository'
import {
    ApplicationUserModel,
    FilterApplicationUserParam,
    ApplicationUserRequirements,
    CreateApplicationUserParam,
    GetApplicationUserResult,
    CreateApplicationUserResult,
} from '@/types/params/application.client'
import { IApplicationManager } from '../IApplicationManager'
import {
    jellyfinEndpoints,
    JellyfinUserResponse,
    CreateJellyfinUserRequestDto,
} from '@/core/clients/jellyfin/jellyfin.types'
import { ApplicationClientNames } from '@/types/enums'

@Injectable()
export class JellyfinClient implements IApplicationManager {
    public readonly name = ApplicationClientNames.Jellyfin

    public readonly requiredInputs: ApplicationUserRequirements = {
        username: true,
        email: false,
        password: true,
        displayName: false,
    }

    readonly #baseUrl: string
    readonly #apiKey: string
    readonly #clientName: string
    readonly #deviceId: string

    constructor(
        @Inject(LoggingProvider) private logger: LoggingProvider,
        @Inject(ConfigRepository) config: ConfigRepository
    ) {
        this.#baseUrl = config.getEnv().jellyfin.baseUrl
        this.#apiKey = config.getEnv().jellyfin.apiKey
        this.#clientName = config.getEnv().jellyfin.clientName
        this.#deviceId = config.getEnv().jellyfin.deviceId

        this.logger.setContext(this.constructor.name)
    }

    get headers() {
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Emby-Authorization':
                `MediaBrowser Client="${this.#clientName}", ` +
                `Device="NestJS Server", ` +
                `DeviceId="${this.#deviceId}", ` +
                `Version="1.0.0", ` +
                `Token="${this.#apiKey}"`,
        }
    }
    // #region IApplicationClient

    async getUser(filters: FilterApplicationUserParam): Promise<GetApplicationUserResult> {
        if (!filters.userServiceAccountId && !filters.username) {
            this.logger.warn('Jellyfin client received a bad get user request')

            return {
                ok: false,
                user: null,
            }
        }

        const user = filters.userServiceAccountId
            ? await this.getUserById(filters.userServiceAccountId)
            : await this.getUserByUsername(filters.username!)

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
        const url = `${this.#baseUrl}${jellyfinEndpoints.getAllUsers}`

        const requestOptions = {
            method: 'GET',
            headers: this.headers,
        }

        const users: ApplicationUserModel[] = []

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(`Failed to retrieve the list of all Jellyfin users`)

                return null
            }

            const data = (await response.json()) as JellyfinUserResponse[]

            for (let user of data) {
                if (!user.Id || !user.Name) {
                    this.logger.error(`Jellyfin user returned a user with missing information. user:${user}'.`)
                }

                users.push({
                    id: user.Id,
                    username: user.Name,
                    isActive: !user.Policy?.IsDisabled,
                })
            }
        } catch (error) {
            this.logger.error(`Error retrieving list of all Jellyfin users.`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            return null
        }

        return users
    }

    async createUser(user: CreateApplicationUserParam): Promise<CreateApplicationUserResult> {
        if (!user.username) {
            this.logger.error('The Jellyfin client received a bad create user request. Username is required')

            return {
                ok: false,
                user: null,
            }
        }

        if (!user.password) {
            this.logger.error('The Jellyfin client received a bad create user request. Password is required')

            return {
                ok: false,
                user: null,
            }
        }

        const existingUser = await this.getUserByUsername(user.username)

        if (existingUser) {
            this.logger.log(`Jellyfin user account already exists: ${user.username}`)

            return {
                ok: false,
                user: existingUser,
            }
        }

        const url = `${this.#baseUrl}${jellyfinEndpoints.createUser}`

        const body = {
            Name: user.username,
            Password: user.password,
        } satisfies CreateJellyfinUserRequestDto

        const requestOptions = {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        }

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(`Failed to create Jellyfin account. Status code: ${response.status}`)

                return {
                    ok: false,
                    user: null,
                }
            }

            const data = (await response.json()) as JellyfinUserResponse

            if (!data.Id || !data.Name) {
                this.logger.error(`Unexpected Jellyfin response after user creation: ${JSON.stringify(data)}`)

                return {
                    ok: false,
                    user: null,
                }
            }

            this.logger.log(`Successfully created Jellyfin user account: ${user.username}`)

            return {
                ok: true,
                user: {
                    id: data.Id,
                    username: data.Name,
                    isActive: data.Policy?.IsDisabled !== true,
                },
            }
        } catch (error) {
            this.logger.error(
                `Error creating Jellyfin user given request: username: ${user.username} email: ${user.email ?? ''}`,
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
        if (filters.userServiceAccountId == undefined && filters.username == undefined) {
            this.logger.warn(`jellyfin client recieved a bad delete user request`)
            return false
        }

        let userServiceAccountId = null

        if (filters.userServiceAccountId == undefined) {
            let user = await this.getUserByUsername(filters.username!)

            if (user != null) {
                userServiceAccountId = user.id
            }
        } else {
            userServiceAccountId = filters.userServiceAccountId
        }

        if (userServiceAccountId == null) {
            this.logger.warn(`jellfin client failed to delete user. Recieved a bad delete request`)
            return false
        }

        const url = `${this.#baseUrl}${jellyfinEndpoints.deleteUser(encodeURIComponent(userServiceAccountId))}`

        const requestOptions = {
            method: 'DELETE',
            headers: this.headers,
        }

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(
                    `Failed to delete Jellyfin user with service account id '${userServiceAccountId}'. Status: ${response.status}`
                )

                return false
            }

            this.logger.log(`Jellyfin client successfully deleted user account: ${JSON.stringify(filters)}`)
            return true
        } catch (error) {
            this.logger.error(`Error deleting Jellyfin user with service account id '${userServiceAccountId}'.`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            return false
        }
    }

    async disableUser(filters: FilterApplicationUserParam): Promise<boolean> {
        return this.updateUserDisabledStatus(filters, true)
    }

    async enableUser(filters: FilterApplicationUserParam): Promise<boolean> {
        return this.updateUserDisabledStatus(filters, false)
    }

    // #endregion

    // #region private methods
    private async updateUserDisabledStatus(filters: FilterApplicationUserParam, isDisabled: boolean): Promise<boolean> {
        if (filters.userServiceAccountId == undefined && filters.username == undefined) {
            this.logger.warn(
                `jellyfin client recieved a bad update user disabled status request. isDisabled: ${isDisabled}`
            )
            return false
        }

        let userServiceAccountId = filters.userServiceAccountId

        if (filters.userServiceAccountId == undefined) {
            let user = await this.getUserByUsername(filters.username!)

            if (user != null) {
                userServiceAccountId = user.id
            }
        }
        const encodedUserServiceAccountId = encodeURIComponent(userServiceAccountId!)

        const getUserUrl = `${this.#baseUrl}${jellyfinEndpoints.getUser(encodedUserServiceAccountId)}`
        const updatePolicyUrl = `${this.#baseUrl}${jellyfinEndpoints.updateUserPolicy(encodedUserServiceAccountId)}`

        try {
            const getUserResponse = await fetch(getUserUrl, {
                method: 'GET',
                headers: this.headers,
            })

            if (!getUserResponse.ok) {
                this.logger.error(
                    `Failed to retrieve Jellyfin user before updating disabled status. Service account id: '${userServiceAccountId}'. Status: ${getUserResponse.status}`
                )

                return false
            }

            const user = (await getUserResponse.json()) as JellyfinUserResponse

            const policy = {
                ...(user.Policy ?? {}),
                IsDisabled: isDisabled,
            }

            const updatePolicyResponse = await fetch(updatePolicyUrl, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(policy),
            })

            if (!updatePolicyResponse.ok) {
                this.logger.error(
                    `Failed to ${isDisabled ? 'disable' : 'enable'} Jellyfin user with service account id '${userServiceAccountId}'. Status: ${updatePolicyResponse.status}`
                )

                return false
            }

            return true
        } catch (error) {
            this.logger.error(
                `Error trying to ${isDisabled ? 'disable' : 'enable'} Jellyfin user with service account id '${userServiceAccountId}'.`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )

            return false
        }
    }

    private async getUserById(userServiceAccountId: string): Promise<ApplicationUserModel | null> {
        const url = `${this.#baseUrl}${jellyfinEndpoints.getUser(encodeURIComponent(userServiceAccountId))}`

        const requestOptions = {
            method: 'GET',
            headers: this.headers,
        }

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(
                    `Failed to retrieve Jellyfin user information with service account id '${userServiceAccountId}'. Status: ${response.status}`
                )
                return null
            }

            const data = (await response.json()) as JellyfinUserResponse

            if (!data.Id || !data.Name) {
                this.logger.error(`Invalid Jellyfin user response for service account id '${userServiceAccountId}'.`)
                return null
            }

            return {
                id: data.Id,
                username: data.Name,
                isActive: !data.Policy?.IsDisabled,
            }
        } catch (error) {
            this.logger.error(
                `Error retrieving Jellyfin user information with service account id '${userServiceAccountId}'.`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                }
            )

            return null
        }
    }

    private async getUserByUsername(username: string): Promise<ApplicationUserModel | null> {
        const url = `${this.#baseUrl}${jellyfinEndpoints.getAllUsers}`

        const requestOptions = {
            method: 'GET',
            headers: this.headers,
        }

        try {
            const allUsersResponse = await fetch(url, requestOptions)

            if (!allUsersResponse.ok) {
                this.logger.error(`Failed to retrieve list of Jellyfin users'. Status: ${allUsersResponse.status}`)
                return null
            }

            const users = (await allUsersResponse.json()) as JellyfinUserResponse[]

            for (let user of users) {
                if (!user.Id || !user.Name) {
                    this.logger.error(`Jellyfin api returned an invalid user account`)
                    return null
                }

                if (user.Name === username) {
                    return {
                        id: user.Id,
                        username: user.Name,
                        isActive: !user.Policy?.IsDisabled,
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error retrieving Jellyfin user information with username: '${username}'.`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })
        }

        return null
    }
    // #endregion
}
