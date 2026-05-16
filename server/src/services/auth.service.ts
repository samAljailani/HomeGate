import { AuthResponseDto, OpenIDRequestDto } from '@/dtos/authDto'
import { Injectable } from '@nestjs/common'
import type { Request } from 'express'

@Injectable()
export class AuthService {
    constructor(){}
    
    OpenIdCallback(query: OpenIDRequestDto): AuthResponseDto {
        return { accessToken: 'dummyAccessToken', refreshToken: 'dummyRefreshToken' }
    }

    googleLogin(req: Request) {
        return req.user;
    }

    
}