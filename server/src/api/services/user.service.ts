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
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'
import { SubscriptionService } from './subscriptions.service'

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
        profileId: string
    ): Promise<UserResponseForAdminDto> {
        const username = await this.generateUsername(newUser.email)
        const user = await this.userRepository.createWithOAuthIdentity({ ...newUser, username }, providerId, profileId)
        return this.userModelToLoadRequestForAdmin(user)
    }

    /**
     * Creates a provisional (PENDING) account for a bound invite. The account is activated on the
     * user's first successful OAuth sign-in; abandoned provisional accounts are reaped by the
     * `cleanup_pending_users` scheduled task.
     */
    async createProvisionalUser(email: string): Promise<UserResponseForAdminDto> {
        const username = await this.generateUsername(email)
        const user = await this.userRepository.createProvisional({ email, username, firstName: '', lastName: '' })
        return this.userModelToLoadRequestForAdmin(user)
    }

    async activateUser(userId: string): Promise<UserResponseForAdminDto> {
        const user = await this.userRepository.activate(userId)
        return this.userModelToLoadRequestForAdmin(user)
    }

    /**
     * Resets a provisional account's staleness clock so a renewed sign-up attempt (e.g. redeeming a
     * fresh invite for the same email) isn't reaped mid-flight by the `cleanup_pending_users` task.
     */
    async touchProvisionalUser(userId: string): Promise<void> {
        await this.userRepository.touchProvisional(userId)
    }

    async getPendingUserByEmail(email: string): Promise<UserResponseForAdminDto | null> {
        const user = await this.userRepository.findPendingByEmail(email)
        if (!user) return null
        return this.userModelToLoadRequestForAdmin(user)
    }

    async deleteStalePendingUsers(olderThanMinutes: number): Promise<boolean> {
        const cutoff = new Date(Date.now() - olderThanMinutes * 60_000)
        const deleted = await this.userRepository.deletePendingOlderThan(cutoff)
        if (deleted > 0) {
            this.logger.log(`Cleaned up ${deleted} stale pending user account(s)`)
        }
        return true
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
            status: user.status,
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

    async softDeleteUser(userId: string): Promise<boolean> {
        await this.subscriptionService.disableAllForUser(userId)
        await this.cleanupUserSessions(userId)
        const success = await this.userRepository.softDelete(userId)
        this.logger.log(`User ${userId} soft deleted`)
        return success
    }

    async hardDeleteUser(userId: string): Promise<boolean> {
        // Cascade in schema handles related records
        const success = await this.userRepository.hardDelete(userId)
        this.logger.log(`User ${userId} hard deleted`)
        return success
    }

    async disableUser(userId: string): Promise<UserResponseForAdminDto | null> {
        const user = await this.userRepository.setEnabled(userId, false)
        this.logger.log(`User ${userId} disabled`)
        return user ? this.userModelToLoadRequestForAdmin(user) : null
    }

    async enableUser(userId: string): Promise<UserResponseForAdminDto | null> {
        const user = await this.userRepository.setEnabled(userId, true)
        this.logger.log(`User ${userId} enabled`)
        return user ? this.userModelToLoadRequestForAdmin(user) : null
    }

    async listUsers(take: number = 50, skip: number = 0): Promise<PaginatedResponseDto<UserResponseForAdminDto>> {
        const [users, total] = await Promise.all([
            this.userRepository.findMany({}, take, skip),
            this.userRepository.count({}),
        ])
        return new PaginatedResponseDto(users.map((u) => this.userModelToLoadRequestForAdmin(u)), total, skip)
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
            status: userModel.status,
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
