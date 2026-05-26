import { IUserRepository } from '@/repositories/IUserRepository'
import { Injectable, Inject } from '@nestjs/common'
import {
    UserCreateRequestDto,
    UserFilterOptions,
    UserLoadRequestDto,
    UserResponseDto,
    UserResponseForAdmin,
} from '@/types/dtos/userDto'
import { UserModel } from '@prisma/generated/models'
import { randomInt } from 'crypto'
import { IUserOAuthIdentityRepository } from '@/repositories'
import { OAuthIdentityCreateRequestDto, OAuthIdentityResponseDto } from '@/types/dtos/userOAuthIdentityDto'

@Injectable()
export class UserService {
    private userRepository: IUserRepository
    private userOAuthIdentityRepository: IUserOAuthIdentityRepository

    constructor(
        @Inject(IUserRepository) userRepository: IUserRepository,
        @Inject(IUserOAuthIdentityRepository)
        userOAuthIdentityRepository: IUserOAuthIdentityRepository
    ) {
        this.userRepository = userRepository
        this.userOAuthIdentityRepository = userOAuthIdentityRepository
    }

    // #region User

    async createUser(newUser: UserCreateRequestDto): Promise<UserResponseDto | null> {
        let response: UserResponseDto = new UserResponseDto()

        newUser.username = await this.generateUsername(newUser.email)

        const savedUser = await this.userRepository.post(newUser)

        if (savedUser) {
            response = this.userModelToLoadRequest(savedUser!)
        }

        return response
    }

    async getUserById(request: UserLoadRequestDto): Promise<UserResponseDto | null> {
        const user = await this.userRepository.get(request)

        if (!!user) {
            return this.userModelToLoadRequest(user!)
        }

        return null
    }

    //TODO: move this to a different Admin User service.
    async getUserByEmail(email: string): Promise<UserResponseForAdmin | null> {
        const user = await this.userRepository.getUserByEmail(email)
        if (!!user) {
            return {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin,
                isDeleted: user.isDeleted,
                createdAt: user.createdAt,
            }
        }
        return null
    }

    async getUserByProperties(filter: UserFilterOptions): Promise<UserResponseDto[]> {
        const users = await this.userRepository.getMany(filter)
        return users.map((u) => this.userModelToLoadRequest(u))
    }

    private async generateUsername(email: string): Promise<string> {
        //remove everything past the @ symbol
        const base = email.split('@')[0]!.toLowerCase()

        let username = base

        while (await this.userRepository.existsByUsername(username)) {
            let counter = randomInt(1, 10000000)
            username = `${base}${counter}`
        }

        return username
    }

    // #endregion User Methods

    // #region UserOAuthIdentity Methods

    async getUserOAuthIdentity(providerId: number, profileId: string): Promise<OAuthIdentityResponseDto | null> {
        const identity = await this.userOAuthIdentityRepository.get({
            providerId: providerId,
            profileId: profileId,
        })
        if (!identity) return null

        return {
            id: identity.id,
            userId: identity.userId,
            providerId: identity.providerId,
            profileId: identity.profileId,
            createdAt: identity.createdAt,
        }
    }

    async CreateUserOAuthIdentity(request: OAuthIdentityCreateRequestDto): Promise<OAuthIdentityResponseDto | null> {
        const identity = await this.userOAuthIdentityRepository.post(request)
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

    userModelToLoadRequestForAdmin(userModel: UserModel): UserResponseForAdmin {
        const dto: UserResponseForAdmin = {
            id: userModel.id,
            email: userModel.email,
            username: userModel.username,
            firstName: userModel.firstName,
            lastName: userModel.lastName,
            isAdmin: userModel.isAdmin,
            isDeleted: userModel.isDeleted,
            createdAt: userModel.createdAt,
        }

        return dto
    }

    // #region Mappers
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
