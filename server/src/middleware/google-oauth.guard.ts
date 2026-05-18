import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OpenIDUserResponseDto } from '../../types/dtos/authDto';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor() {
    super({
      accessType: 'offline',
    });
  }

  override handleRequest<TUser = OpenIDUserResponseDto>(err: Error | null, user: any | false, _info: any, _context: ExecutionContext): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Google authentication failed');
    }

    return user;
  }
}