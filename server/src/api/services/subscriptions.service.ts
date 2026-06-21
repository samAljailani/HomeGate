import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common'
import { UserService } from './user.service'
import { IServiceRepository, IUserAccountRepository } from '@/data/repositories'
import { SubscriptionCreateRequestDto, SubscriptionDeleteRequestDto } from '@/types/dtos/subscriptionsDto'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { ApplicationClientNames } from '@/types/enums'
import { LoggingProvider } from '@/infrastructure/logger.provider'

@Injectable()
export class SubscriptionService {
    private userService: UserService
    private serviceRepository: IServiceRepository
    private userAccountRepository: IUserAccountRepository
    private applicationClientRegistery: ApplicationClientRegistry
    private logger: LoggingProvider

    constructor(
        @Inject(UserService) userService: UserService,
        @Inject(IServiceRepository) serviceResponse: IServiceRepository,
        @Inject(IUserAccountRepository) userAccountRepository: IUserAccountRepository,
        @Inject(ApplicationClientRegistry) applicationClientRegistery: ApplicationClientRegistry,
        @Inject(LoggingProvider) logger: LoggingProvider
    ) {
        this.userService = userService
        this.serviceRepository = serviceResponse
        this.userAccountRepository = userAccountRepository
        this.applicationClientRegistery = applicationClientRegistery
        this.logger = logger
        this.logger.setContext(this.constructor.name)
    }

    async subscribe(request: SubscriptionCreateRequestDto, userId: string) {
        // TODO: check if the user is allowed to subscribe to the service.
        // This needs to be applied after authorization rules are added to the application.

        // TODO: if valid email, have the user confirm the email;
        // otherwise, the account should be suspended.

        const user = await this.userService.getUserById({ userId })

        if (!user) {
            throw new BadRequestException('User does not exist')
        }

        const service = await this.serviceRepository.findById(request.serviceId)

        if (!service?.enabled) {
            throw new BadRequestException('Service not available')
        }

        const existingUserServiceAccount = await this.userAccountRepository.find(userId, request.serviceId)

        if (existingUserServiceAccount) {
            throw new ConflictException('User already subscribed to the service')
        }

        const enabledServices = await this.applicationClientRegistery.getEnabled()

        const client = enabledServices.find((x) => x.name === (service.name as ApplicationClientNames))

        if (!client) {
            throw new BadRequestException('Service client not available')
        }

        if (
            client.requiredInputs.password &&
            (!request.servicePassword || request.servicePassword !== request.confirmServicePassword)
        ) {
            throw new BadRequestException('Passwords do not match')
        }

        if (client.requiredInputs.email && request.email?.toLowerCase() !== user.email.toLowerCase()) {
            throw new BadRequestException("Email address must match the user's HomeGate account email address")
        }

        try {
            const existingServiceUserResult = await client.getUser({
                username: request.serviceUsername,
                email: request.email,
                userServiceAccountId: undefined
            })

            if (existingServiceUserResult.ok || existingServiceUserResult.user) {
                throw new ConflictException('Service account already exists')
            }

            const createdServiceUserResult = await client.createUser({
                username: request.serviceUsername,
                password: request.servicePassword,
                email: request.email,
                displayName: request.serviceUsername,
            })

            if (!createdServiceUserResult.ok || !createdServiceUserResult.user) {
                throw new InternalServerErrorException('The service client did not return a valid response')
            }

            const createdServiceUser = createdServiceUserResult.user

            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 30) //TODO: make this an configuration item

            const userServiceAccount = await this.userAccountRepository.create({
                userId,
                serviceId: request.serviceId,
                userServiceAccountId: createdServiceUser.id,
                username: createdServiceUser.username,
                isActive: createdServiceUser.isActive,
                autoRenew: request.autoRenew,
                expiresAt: expiresAt
            })

            this.logger.log(`User ${userId} successfully subscribed to service: ${service.name}`)

            // TODO: update cookie

            return userServiceAccount
        } catch (err) {
            this.logger.error(
                `Failed to subscribe user ${userId} to service: ${service.name}. ${
                    err instanceof Error ? err.message : ''
                }`,
                {
                    stackTrace: err instanceof Error ? err.stack : '',
                },
            )

            throw err
        }
    }

    async cancel(request: SubscriptionDeleteRequestDto, userId: string): Promise<boolean> {
        const user = await this.userService.getUserById({ userId })

        if (!user) {
            throw new BadRequestException('User does not exist')
        }

        const service = await this.serviceRepository.findById(request.serviceId)

        if (!service) {
            throw new BadRequestException('Service does not exist')
        }

        let existingUserServiceAccount = await this.userAccountRepository.find(userId, request.serviceId)

        if (
            !existingUserServiceAccount ||
            !existingUserServiceAccount.isActive ||
            existingUserServiceAccount.expiresAt.getTime() <= Date.now()
        ) {
            throw new ConflictException('User is not subscribed to the service')
        }

        try {
            if (request.deleteImmediately === true) {
                const enabledServices = await this.applicationClientRegistery.getEnabled()

                const client = enabledServices.find(
                    (x) => x.name === (service.name as ApplicationClientNames),
                )

                if (!client) {
                    throw new BadRequestException('Service client not available')
                }

                const userServiceAccountDeleted = await client.deleteUser({
                    userServiceAccountId: existingUserServiceAccount.userServiceAccountId,
                    username: existingUserServiceAccount.username,
                    email: user.email,
                })

                if (!userServiceAccountDeleted) {
                    throw new InternalServerErrorException(
                        `Failed to delete user service account for user '${user.id}' and service '${service.id}'`,
                    )
                }

                await this.userAccountRepository.delete(user.id, service.id)

                this.logger.log(
                    `User '${user.id}' immediately cancelled subscription for service '${service.id}'`,
                )

                return true
            } else if (existingUserServiceAccount.autoRenew) {
                existingUserServiceAccount.autoRenew = false

                const updatedUserServiceAccount = await this.userAccountRepository.update(existingUserServiceAccount)

                if (!updatedUserServiceAccount) {
                    throw new InternalServerErrorException(
                        `Failed to cancel auto-renew for user '${user.id}' and service '${service.id}'`,
                    )
                }

                existingUserServiceAccount = updatedUserServiceAccount

                this.logger.log(
                    `User '${user.id}' cancelled auto-renew for service '${service.id}'. Access remains active until ${existingUserServiceAccount.expiresAt.toISOString()}`,
                )

                return true
            }

            this.logger.log(
                `User '${user.id}' already had auto-renew disabled for service '${service.id}'`,
            )

            return true
        } catch (error) {
            this.logger.error(
                `Failed to cancel subscription for user '${user.id}' and service '${service.id}'`,
                {
                    stackTrace: error instanceof Error ? error.stack : String(error),
                },
            )

            throw error
        }
    }

}
