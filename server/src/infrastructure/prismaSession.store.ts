import { Injectable } from '@nestjs/common';
import session from 'express-session';
import { SessionRepository } from '@/repositories/session.repository';

@Injectable()
export class PrismaSessionStore extends session.Store {
  constructor(
    private readonly sessionRepository: SessionRepository,
  ) {
    super();
  }

  get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): void {}

  set(sid: string, sessionData: session.SessionData, callback?: (err?: unknown) => void): void {}

  destroy(sid: string, callback?: (err?: unknown) => void): void {}

  touch(sid: string, sessionData: session.SessionData, callback?: () => void): void {}
}