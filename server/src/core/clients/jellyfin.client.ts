import { LoggingProvider } from '@/infrastructure/logger.provider'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigRepository } from '@/data/repositories/config.repository'
import { ApplicationUserModel, CreateApplicationUserParam } from '@/types/params/application.client'
import { IApplicationClient } from './IApplicationClient'

interface createJellyfinUserRequestDto {
    Name: string
    Password: string
}

interface JellyfinUserResponse {
    Id: string
    Name: string
    Policy?: {
        IsDisabled?: boolean
    }
}

@Injectable()
export class JellyfinClient implements IApplicationClient {
    public readonly applicationClientName = 'jellyfin'
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

    async getUser(userServiceAccountId: string): Promise<ApplicationUserModel | null> {
        const url = `${this.#baseUrl}/Users/${encodeURIComponent(userServiceAccountId)}`

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

    async getAllUsers(): Promise<ApplicationUserModel[] | null> {
        const url = `${this.#baseUrl}/Users`

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

    async createUser(user: CreateApplicationUserParam): Promise<ApplicationUserModel | null> {
        if (!user.username) {
            this.logger.error('The Jellyfin client received a bad create user request. Username is required')
            return null
        }

        if (!user.password) {
            this.logger.error('The Jellyfin client received a bad create user request. Password is required')
            return null
        }

        let userToReturn: ApplicationUserModel

        // 'POST'
        // '/Users/New'
        const url = `${this.#baseUrl}/Users/New`
        const body = {
            Name: user.username,
            Password: user.password,
        } satisfies createJellyfinUserRequestDto

        const requestOptions = {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        }

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(`Failed to create Jellyfin account. Status code: ${response.status}`)
                return null
            }

            const data = (await response.json()) as JellyfinUserResponse

            if (!data.Id || !data.Name) {
                this.logger.error(`Unexpected Jellyfin response after user creation: ${JSON.stringify(data)}`)
                return null
            }

            userToReturn = {
                id: data.Id,
                username: data.Name,
                isActive: data.Policy?.IsDisabled === true ? false : true, // assume user is enabled if not provided in the response
            }
        } catch (error) {
            this.logger.error(`Error creating Jellyfin user given request: ${JSON.stringify(user)}`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            //TODO: determine if we should rethrow the errors.
            return null
        }

        return userToReturn
    }

    async deleteUser(userServiceAccountId: string): Promise<boolean> {
        const url = `${this.#baseUrl}/Users/${encodeURIComponent(userServiceAccountId)}`

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

            return true
        } catch (error) {
            this.logger.error(`Error deleting Jellyfin user with service account id '${userServiceAccountId}'.`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            return false
        }
    }

    async disableUser(userServiceAccountId: string): Promise<boolean> {
        return this.updateUserDisabledStatus(userServiceAccountId, true)
    }

    async enableUser(userServiceAccountId: string): Promise<boolean> {
        return this.updateUserDisabledStatus(userServiceAccountId, false)
    }

    private async updateUserDisabledStatus(userServiceAccountId: string, isDisabled: boolean): Promise<boolean> {
        const encodedUserServiceAccountId = encodeURIComponent(userServiceAccountId)

        const getUserUrl = `${this.#baseUrl}/Users/${encodedUserServiceAccountId}`
        const updatePolicyUrl = `${this.#baseUrl}/Users/${encodedUserServiceAccountId}/Policy`

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

    // #endregion
}
