import { IUserRepository } from "@/repositories/IUserRepository";
import { Injectable, Inject } from "@nestjs/common";
import { UserCreateRequestDto, UserFilterOptions, UserLoadRequestDto, UserResponseDto } from '@/types/dtos/userDto';
import { UserModel } from '@prisma/generated/models'
import { randomInt } from "crypto";
import { ApiResponse } from "../../lib/ApiMessaging";
import { IUserOAuthIdentityRepository, IOAuthProviderRepository } from "@/repositories";
import { OAuthIdentityResponseDto } from "@/types/dtos/userOAuthIdentityDto";

@Injectable()
export class UserService{
    private userRepository: IUserRepository;
    private userOAuthIdentityRepository: IUserOAuthIdentityRepository;
    private oauthProviderRepository: IOAuthProviderRepository;

    constructor(
        @Inject(IUserRepository) userRepository: IUserRepository,
        @Inject(IUserOAuthIdentityRepository) userOAuthIdentityRepository: IUserOAuthIdentityRepository,
        @Inject(IOAuthProviderRepository) oauthProviderRepository: IOAuthProviderRepository,
    ){
        this.userRepository = userRepository;
        this.userOAuthIdentityRepository = userOAuthIdentityRepository;
        this.oauthProviderRepository = oauthProviderRepository;
    }

    // #region User

    async createUser(newUser: UserCreateRequestDto): Promise<UserResponseDto | null> {
        let response: UserResponseDto = new UserResponseDto();

        newUser.username = await this.generateUsername(newUser.email)

        const savedUser = await this.userRepository.post(newUser)

        if(savedUser){
            response = this.userModelToLoadRequest(savedUser!)
        }

        return response;
    }

    async getUserById(request: UserLoadRequestDto): Promise<UserResponseDto | null> {

        const user = await this.userRepository.get(request);

        if(!!user){
            return this.userModelToLoadRequest(user!);
        }

        return null;

    } 

    async getUserByEmail(email: string): Promise<UserResponseDto | null> {
        const user = await this.userRepository.getUserByEmail(email);
        
        if(!!user){
            return this.userModelToLoadRequest(user)
        }

        return null;
    }

    async getUserByProperties(filter: UserFilterOptions): Promise<UserResponseDto[]> {
        const users = await this.userRepository.getMany(filter);
        return users.map(u => this.userModelToLoadRequest(u));
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
    
    async getUserOAuthIdentity(providerName: string, profileId: string): Promise<OAuthIdentityResponseDto | null> {
        const provider = await this.oauthProviderRepository.getByName(providerName);
        if (!provider) return null;
        return this.userOAuthIdentityRepository.get({ provider_id: provider.id, profile_id: profileId });
    }
    // #endregion UserOAuthIdentity Methods

    // #region Mappers
    userModelToLoadRequest(userModel: UserModel): UserResponseDto {
        const dto: UserResponseDto = {
            id: userModel.id,
            email: userModel.email,
            username: userModel.username,
            first_name: userModel.first_name,
            last_name: userModel.last_name,
            is_admin: userModel.is_admin,
        }

        return dto
    }

    // #endregion Mappers
}