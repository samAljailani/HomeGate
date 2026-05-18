import { AuthResponseDto, OpenIDRequestDto, OpenIDUserResponseDto } from '../../types/dtos/authDto'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AuthService {
    constructor(){}
    
    OpenIdCallback(query: OpenIDRequestDto): AuthResponseDto {
        return { accessToken: 'dummyAccessToken', refreshToken: 'dummyRefreshToken' }
    }

    googleLogin(req: OpenIDUserResponseDto): OpenIDUserResponseDto {
        return req as OpenIDUserResponseDto;
    }

    
}