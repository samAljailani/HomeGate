import { Inject, Injectable } from '@nestjs/common'
import { IApplicationClient } from '../IApplicationClient'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ConfigRepository } from '@/data/repositories/config.repository'
import { ApplicationUserModel, CreateApplicationUserParam } from '@/types/params/application.client'
import { ApplicationClientNames, ImmichProvisioningMode } from '@/types/enums'
import { ImmichUserResponse, CreateImmichUserRequestDto, immichEndpoints } from './immich.types'

@Injectable()
export class ImmichClient implements IApplicationClient {
    public readonly name = ApplicationClientNames.Immich

    readonly #baseUrl: string
    readonly #apiKey: string
    readonly #provisioningMode: ImmichProvisioningMode

    constructor(
        @Inject(LoggingProvider) private logger: LoggingProvider,
        @Inject(ConfigRepository) config: ConfigRepository
    ) {
        this.logger.setContext(this.constructor.name)

        this.#baseUrl = config.getEnv().immich.baseUrl
        this.#apiKey = config.getEnv().immich.apiKey
        this.#provisioningMode = config.getEnv().immich.provisioningMode
    }

    get headers() {
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'x-api-key': this.#apiKey,
        }
    }

    // #region IApplicationClient

    async getUser(userServiceAccountId: string): Promise<ApplicationUserModel | null> {
        const url = `${this.#baseUrl}${immichEndpoints.getUser(encodeURIComponent(userServiceAccountId))}`

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

    async getAllUsers(): Promise<ApplicationUserModel[] | null> {
        const url = `${this.#baseUrl}${immichEndpoints.getAllUsers(JSON.stringify(true))}`

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
                    this.logger.error(`Immich returned a user with missing information. user: ${JSON.stringify(user)}`)
                    continue
                }

                users.push({
                    id: user.id,
                    username: user.email ?? user.name!,
                    isActive: !user.deletedAt,
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

    async createUser(user: CreateApplicationUserParam): Promise<ApplicationUserModel | null> {
        if (!user.email) {
            this.logger.error('The Immich client received a bad create user request. Email is required')
            return null
        }

        if (this.#provisioningMode !== 'local') {
            this.logger.error(
                'The Immich client cannot create local users while in OAuth provisioning mode. Use OAuth auto-registration or identity-provider group access instead.'
            )

            return null
        }

        if (!user.password) {
            this.logger.error('The Immich client received a bad create user request. Password is required')
            return null
        }

        const url = `${this.#baseUrl}${immichEndpoints.createUser}`

        const body = {
            email: user.email,
            name: user.displayName ?? user.username,
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
                return null
            }

            const data = (await response.json()) as ImmichUserResponse

            if (!data.id || (!data.email && !data.name)) {
                this.logger.error(`Unexpected Immich response after user creation: ${JSON.stringify(data)}`)
                return null
            }

            return {
                id: data.id,
                username: data.email ?? data.name!,
                isActive: !data.deletedAt,
            }
        } catch (error) {
            this.logger.error(`Error creating Immich user given request: ${JSON.stringify(user)}`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            return null
        }
    }

    async deleteUser(userServiceAccountId: string): Promise<boolean> {
        const url = `${this.#baseUrl}${immichEndpoints.deleteUser(encodeURIComponent(userServiceAccountId))}`

        const requestOptions = {
            method: 'DELETE',
            headers: this.headers,
        }

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(
                    `Failed to delete Immich user with service account id '${userServiceAccountId}'. Status: ${response.status}`
                )

                return false
            }

            return true
        } catch (error) {
            this.logger.error(`Error deleting Immich user with service account id '${userServiceAccountId}'.`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            return false
        }
    }

    async disableUser(userServiceAccountId: string): Promise<boolean> {
        // Immich does not expose a normal "disabled" flag.
        // This soft-deletes the user and disables access until restored.
        return this.deleteUser(userServiceAccountId)
    }

    async enableUser(userServiceAccountId: string): Promise<boolean> {
        const url = `${this.#baseUrl}${immichEndpoints.restoreUser(encodeURIComponent(userServiceAccountId))}`

        const requestOptions = {
            method: 'POST',
            headers: this.headers,
        }

        try {
            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                this.logger.error(
                    `Failed to restore Immich user with service account id '${userServiceAccountId}'. Status: ${response.status}`
                )

                return false
            }

            return true
        } catch (error) {
            this.logger.error(`Error restoring Immich user with service account id '${userServiceAccountId}'.`, {
                stackTrace: error instanceof Error ? error.stack : String(error),
            })

            return false
        }
    }

    // #endregion
}
