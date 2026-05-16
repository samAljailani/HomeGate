import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor() {
    super({
      accessType: 'offline',
    });
  }

  override handleRequest<TUser = any>(err: any, user: any, _info: any, _context: ExecutionContext): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Google authentication failed');
    }
    return user;
  }
}