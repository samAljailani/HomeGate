import { Injectable, Inject } from '@nestjs/common';
import session from 'express-session';
import { ISessionRepository } from '@/repositories/ISessionRepository';
import { CryptographyProvider } from '@/infrastructure/cryptography.provider';

@Injectable()
export class PrismaSessionStore extends session.Store {
  constructor(
    @Inject(ISessionRepository) private readonly sessionRepository: ISessionRepository,
    @Inject(CryptographyProvider) private readonly cryptographyProvider: CryptographyProvider,
  ) {
    super();
  }

  async get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): Promise<void> {
    try {
      const hashedSid = this.cryptographyProvider.HashSha256(sid).toString('hex');
      const sessionRecord = await this.sessionRepository.get({ sid: hashedSid });
      
      if (!sessionRecord) {
        return callback(null, null);
      }

      const data = sessionRecord.data as unknown;

      //minimally check whether the cookie data within the database is correct.
      if (!data || typeof data !== 'object' || !('cookie' in data)) {
        return callback(null, null);
      }

      callback(null, data as session.SessionData);
    } catch (error) {
      callback(error);
    }
  }

  async set(sid: string, sessionData: session.SessionData, callback?: (err?: unknown) => void): Promise<void> {
    try {
      const hashedSid = this.cryptographyProvider.HashSha256(sid).toString('hex');
      const expiresAt = sessionData.cookie?.expires 
        ? new Date(sessionData.cookie.expires) 
        : new Date(Date.now() + (sessionData.cookie.maxAge || 0));
      
      const existing = await this.sessionRepository.get({ sid: hashedSid });
      
      if (existing) {
        await this.sessionRepository.put(hashedSid, sessionData, expiresAt);
      } else {
        await this.sessionRepository.post({
          sid: hashedSid,
          data: sessionData,
          expiresAt,
          userId: (sessionData as any).userId || undefined,
        });
      }
      
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  async destroy(sid: string, callback?: (err?: unknown) => void): Promise<void> {
    try {
      const hashedSid = this.cryptographyProvider.HashSha256(sid).toString('hex');
      await this.sessionRepository.delete({ sid: hashedSid });
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  override async touch(sid: string, sessionData: session.SessionData, callback?: (err?: unknown) => void): Promise<void> {
    try {
        const hashedSid = this.cryptographyProvider.HashSha256(sid).toString('hex');

        const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires)
        : new Date(Date.now() + (sessionData.cookie.originalMaxAge ?? 0));

        await this.sessionRepository.touch(hashedSid, expiresAt);
        callback?.();
    } catch (error) {
      callback?.(error);
    }
  }
}