import { UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20'
import { Inject, Injectable } from '@nestjs/common'
import { EnvRepository } from '@/data/repositories/env.repository'
import { routes } from '@/types/dtos/routes'
import { OpenIDRequestDto, OAuthUserProfileDto } from '@/types/dtos/authDto'
import { OAuthProviderName } from '@/types/models/oauthProvider'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(@Inject(EnvRepository) configRepository: EnvRepository) {
        const { clientId, clientSecret, scope } = configRepository
            .getEnv()
            .oAuth.providers.find((x) => x.name == OAuthProviderName.google)!
        const host = configRepository.getEnv().host

        const dto: OpenIDRequestDto = {
            clientID: clientId,
            clientSecret: clientSecret,
            callbackURL: `${host}${routes.auth.googleRedirect}`,
            scope: scope,
            pkce: true,
            state: true,
            nonce: true,
        }

        super(dto)
    }

    async validate(accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void> {
        const { id, name, emails, photos, provider } = profile

        const email = emails?.[0]?.value
        if (!email) throw new UnauthorizedException('No email from Google profile')

        const user: OAuthUserProfileDto = {
            providerAccountId: id,
            email,
            ...(name?.givenName && { firstName: name.givenName }),
            ...(name?.familyName && { lastName: name.familyName }),
            ...(photos?.[0]?.value && { picture: photos[0].value }),
            accessToken,
            refreshToken,
            provider,
        }

        done(null, user)
    }
}
