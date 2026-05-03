import { AuthResponseDto, OpenIDRequestDto } from '@/dtos/authDto'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AuthService {
    constructor(){

    }
    
    OpenIdCallback(query: OpenIDRequestDto): AuthResponseDto {
        return { accessToken: 'dummyAccessToken', refreshToken: 'dummyRefreshToken' }
    }
}