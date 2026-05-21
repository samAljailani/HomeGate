import { AuthResponseDto, OpenIDRequestDto, OpenIDUserResponseDto } from '@/types/dtos/authDto'
import { Injectable, Inject } from '@nestjs/common'
import { UserService } from './user.service'
import { ApiResponse, AddMessage } from '../../lib/ApiMessaging';

@Injectable()
export class AuthService {
    constructor(@Inject(UserService) private userService: UserService ){}
    
    OpenIdCallback(query: OpenIDRequestDto): AuthResponseDto {
        return { accessToken: 'dummyAccessToken', refreshToken: 'dummyRefreshToken' }
    }

    async googleLogin(request: OpenIDUserResponseDto): Promise<ApiResponse<AuthResponseDto>> {
        let response: ApiResponse<AuthResponseDto> = {success: true, messages: []};

        const user = await this.userService.getUserByEmail(request.email);

        if(user == null){
            AddMessage(response, ['log', 'toast'], 'Warn', `Failed Login attempt for non registered user. Provider: ${request.provider}, Email: ${request.email}.`);
            response.success = false;    
            return response;     
        }

        //TODO: if user is deleted or inactive add message and return.

        const identity = await this.userService.getUserOAuthIdentity(request.provider, request.providerAccountId);

        if(identity == null){
            //the user is a registed user, but has logged in with a new identity provider.
            //TODO: create identity
            //TODO: wrap call in a try catch or wrap the entire method implementation in a single try catch
        }

        //TODO: create session and token
        //TODO: store token
        //TODO: set response.data

        return response;
    }

    
}