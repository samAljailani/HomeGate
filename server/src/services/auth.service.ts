import { OpenIDUserResponseDto } from '@/types/dtos/authDto'
import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { UserService } from './user.service'
import { IOAuthProviderRepository } from '@/repositories';
import { ApiResponse, AddMessage } from '../../lib/ApiMessaging';
import { UserResponseDto } from '@/types/dtos/userDto';

@Injectable()
export class AuthService {
    constructor(
        @Inject(forwardRef(() => UserService)) private userService: UserService,
        @Inject(IOAuthProviderRepository) private oauthProviderRepository: IOAuthProviderRepository,
    ){}

    async googleLogin(request: OpenIDUserResponseDto): Promise<ApiResponse<UserResponseDto | null>> {
        let response: ApiResponse<UserResponseDto | null> = {success: true, messages: []};

        try{
            const user = await this.userService.getUserByEmail(request.email);

            if(user == null){
                AddMessage(response, ['log', 'toast'], 'Warn', `Failed Login attempt for non registered user. Provider: ${request.provider}, Email: ${request.email}.`);
                response.success = false;    
                return response;     
            }

            if(user.isDeleted){
                AddMessage(response, ['log'], 'Warn', `Attempted login for user with email: ${request.email}, provider: ${request.provider}`);
                response.success = false;
                return response;
            }
            

            const provider = await this.oauthProviderRepository.getByName(request.provider);

            if(provider == null){
                AddMessage(response, ['log'], 'Critical', `Attempted login for user with email: ${request.email}, provider: ${request.provider}, yet the provider is not a recognized provider.`);
                response.success = false;
                return response;
            }

            const identity = await this.userService.getUserOAuthIdentity(provider.id, request.providerAccountId);

            if(identity == null && provider) {
                // The user is registered, but has logged in with a new identity provider.
                // Create the identity for this user and provider.
                await this.userService.CreateUserOAuthIdentity({
                    userId: user.id,
                    providerId: provider.id,
                    profileId: request.providerAccountId,
                });
            }

            response.success = true;
            response.data = user;
        } catch {
            AddMessage(response, ['log'], 'Error', `An unhandle error occured while attempting to login user with email: ${request.email}, provider: ${request.provider}`);
            AddMessage(response, ['toast'], 'Error', `Login Failed`);
            response.success = false;
        }

        return response;
    }

    
}