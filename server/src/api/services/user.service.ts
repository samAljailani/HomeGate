import { IUserRepository } from '@/data/repositories/IUserRepository'
import { ISessionRepository } from '@/data/repositories/ISessionRepository'
import { Injectable, Inject, forwardRef } from '@nestjs/common'
import {
    UserCreateRequestDto,
    UserLoadRequestDto,
    UserResponseDto,
    UserResponseForAdminDto,
} from '@/types/dtos/userDto'
import { UserModel, UserFilterOptions } from '@/types/models/user'
import { randomInt } from 'crypto'
import { IUserOAuthIdentityRepository } from '@/data/repositories'
import { OAuthIdentityCreateRequestDto, OAuthIdentityResponseDto } from '@/types/dtos/userOAuthIdentityDto'
import { BaseService } from './base.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { SubscriptionService } from './subscriptions.service'
import { Prisma } from '@prisma/generated'

@Injectable()
export class UserService extends BaseService {
    private userRepository: IUserRepository
    private userOAuthIdentityRepository: IUserOAuthIdentityRepository

    constructor(
        @Inject(IUserRepository) userRepository: IUserRepository,
        @Inject(LoggingProvider) logger: LoggingProvider,
        @Inject(IUserOAuthIdentityRepository) userOAuthIdentityRepository: IUserOAuthIdentityRepository,
        @Inject(forwardRef(() => SubscriptionService)) private readonly subscriptionService: SubscriptionService,
        @Inject(ISessionRepository) private readonly sessionRepository: ISessionRepository
    ) {
        super(logger)
        this.userRepository = userRepository
        this.userOAuthIdentityRepository = userOAuthIdentityRepository
    }

    // #region User

    async createUser(newUser: UserCreateRequestDto): Promise<UserResponseForAdminDto | null> {
        let response: UserResponseForAdminDto = new UserResponseForAdminDto()

        const username = await this.generateUsername(newUser.email)

        const savedUser = await this.userRepository.create({ ...newUser, username })

        if (savedUser) {
            response = this.userModelToLoadRequestForAdmin(savedUser!)
        }

        return response
    }

    async createUserWithOAuthIdentity(
        newUser: UserCreateRequestDto,
        providerId: number,
        profileId: string,
        tx?: Prisma.TransactionClient
    ): Promise<UserResponseForAdminDto> {
        const username = await this.generateUsername(newUser.email)
        const user = await this.userRepository.createWithOAuthIdentity({ ...newUser, username }, providerId, profileId, tx)
        return this.userModelToLoadRequestForAdmin(user)
    }

    async getUserById(request: UserLoadRequestDto): Promise<UserResponseDto | null> {
        const user = await this.userRepository.findById(request.userId)

        if (user) {
            return this.userModelToLoadRequest(user)
        }

        return null
    }

    //TODO: move this to a different Admin User service.
    async getUserByEmail(email: string): Promise<UserResponseForAdminDto | null> {
        const user = await this.userRepository.findByEmail(email)
        if (!user) return null
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            isDeleted: user.isDeleted,
            isEnabled: user.isEnabled,
            createdAt: user.createdAt,
        }
    }

    async getUserByProperties(filter: UserFilterOptions): Promise<UserResponseDto[]> {
        const users = await this.userRepository.findMany(filter)
        return users.map((u) => this.userModelToLoadRequest(u))
    }

    private async generateUsername(email: string): Promise<string> {
        //remove everything past the @ symbol
        const base = email.split('@')[0]!.toLowerCase()

        let username = base

        while (await this.userRepository.usernameExists(username)) {
            const counter = randomInt(1, 10000000)
            username = `${base}${counter}`
        }

        return username
    }

    // #endregion User Methods

    // #region Delete Methods

    async softDeleteUser(userId: string): Promise<void> {
        await this.subscriptionService.disableAllForUser(userId)
        await this.cleanupUserSessions(userId)
        await this.userRepository.softDelete(userId)
        this.logger.log(`User ${userId} soft deleted`)
    }

    async hardDeleteUser(userId: string): Promise<void> {
        // Cascade in schema handles related records
        await this.userRepository.hardDelete(userId)
        this.logger.log(`User ${userId} hard deleted`)
    }

    async disableUser(userId: string): Promise<void> {
        await this.userRepository.setEnabled(userId, false)
        this.logger.log(`User ${userId} disabled`)
    }

    async enableUser(userId: string): Promise<void> {
        await this.userRepository.setEnabled(userId, true)
        this.logger.log(`User ${userId} enabled`)
    }

    async listUsers(take?: number, skip?: number): Promise<UserResponseForAdminDto[]> {
        const users = await this.userRepository.findMany({}, take, skip)
        return users.map((u) => this.userModelToLoadRequestForAdmin(u))
    }

    async getUserByIdForAdmin(userId: string): Promise<UserResponseForAdminDto | null> {
        const user = await this.userRepository.findById(userId)
        if (!user) return null
        return this.userModelToLoadRequestForAdmin(user)
    }

    private async cleanupUserSessions(userId: string): Promise<void> {
        await this.sessionRepository.deleteByUserId(userId)
    }

    // #endregion Delete Methods

    // #region UserOAuthIdentity Methods

    async getUserOAuthIdentity(providerId: number, profileId: string): Promise<OAuthIdentityResponseDto | null> {
        const identity = await this.userOAuthIdentityRepository.find(providerId, profileId)
        if (!identity) return null

        return {
            id: identity.id,
            userId: identity.userId,
            providerId: identity.providerId,
            profileId: identity.profileId,
            createdAt: identity.createdAt,
        }
    }

    async hasIdentityForProvider(userId: string, providerId: number): Promise<boolean> {
        const identities = await this.userOAuthIdentityRepository.findMany({ userId, providerId }, 1)
        return identities.length > 0
    }

    async CreateUserOAuthIdentity(request: OAuthIdentityCreateRequestDto): Promise<OAuthIdentityResponseDto | null> {
        const identity = await this.userOAuthIdentityRepository.create(request)
        if (!identity) return null

        return {
            id: identity.id,
            userId: identity.userId,
            providerId: identity.providerId,
            profileId: identity.profileId,
            createdAt: identity.createdAt,
        }
    }

    // #endregion UserOAuthIdentity Methods

    // #region Mappers

    userModelToLoadRequestForAdmin(userModel: UserModel): UserResponseForAdminDto {
        const dto: UserResponseForAdminDto = {
            id: userModel.id,
            email: userModel.email,
            username: userModel.username,
            firstName: userModel.firstName,
            lastName: userModel.lastName,
            isAdmin: userModel.isAdmin,
            isDeleted: userModel.isDeleted,
            isEnabled: userModel.isEnabled,
            createdAt: userModel.createdAt,
        }

        return dto
    }

    userModelToLoadRequest(userModel: UserModel): UserResponseDto {
        const dto: UserResponseDto = {
            id: userModel.id,
            email: userModel.email,
            username: userModel.username,
            firstName: userModel.firstName,
            lastName: userModel.lastName,
            isAdmin: userModel.isAdmin,
        }

        return dto
    }

    // #endregion Mappers
}
