import {UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigRepository } from '@/repositories/config.repository';
import routes from '@/dtos/routes'
import { OpenIDRequestDto, OpenIDUserResponseDto } from '@/dtos/authDto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(ConfigRepository) configRepository: ConfigRepository) {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SERVER_BASE_URL } = configRepository.getEnv();

    const dto: OpenIDRequestDto = {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${SERVER_BASE_URL}${routes.auth.googleRedirect}`,
      scope: ['openid', 'email', 'profile'],
    };

    super(dto);
  }
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, name, emails, photos, provider } = profile;

    const email = emails?.[0]?.value;
    if (!email) throw new UnauthorizedException('No email from Google profile');

    const user: OpenIDUserResponseDto = {
      providerAccountId: id,
      email,
      ...(name?.givenName && { firstName: name.givenName }),
      ...(name?.familyName && { lastName: name.familyName }),
      ...(photos?.[0]?.value && { picture: photos[0].value }),
      accessToken,
      refreshToken,
      provider,
    };

    done(null, user);
  }
}