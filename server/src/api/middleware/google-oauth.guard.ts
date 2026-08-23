import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { AuthGuard } from '@nestjs/passport'
import { OAuthUserProfileDto } from '../../types/dtos/authDto'

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
    constructor() {
        super({
            accessType: 'offline',
        })
    }

    override handleRequest<TUser = OAuthUserProfileDto>(
        err: Error | null,
        user: any | false,
        _info: any,
        _context: ExecutionContext
    ): TUser {
        if (err || !user) {
            throw err ?? new UnauthorizedException('Google authentication failed')
        }

        const profile = plainToInstance(OAuthUserProfileDto, user)
        const errors = validateSync(profile)

        if (errors.length > 0) {
            throw new UnauthorizedException('Invalid OAuth user profile from Google')
        }

        return profile as TUser
    }
}
