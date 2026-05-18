import { EnvData } from '@homepage/types';
import { Injectable } from '@nestjs/common';

const getEnv = (): EnvData => {
  const CLIENT_RELATIVE_STATIC_PATH = process.env['CLIENT_RELATIVE_STATIC_PATH'];
  const PORT = process.env['PORT'];
  const SERVER_BASE_URL = process.env['SERVER_BASE_URL'];
  const GOOGLE_CLIENT_ID = process.env['GOOGLE_CLIENT_ID'];
  const GOOGLE_CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'];
  const DATABASE_URL = process.env['DATABASE_URL']

  const missing = [
    !CLIENT_RELATIVE_STATIC_PATH && 'CLIENT_RELATIVE_STATIC_PATH',
    !PORT && 'PORT',
    !SERVER_BASE_URL && 'SERVER_BASE_URL',
    !GOOGLE_CLIENT_ID && 'GOOGLE_CLIENT_ID',
    !GOOGLE_CLIENT_SECRET && 'GOOGLE_CLIENT_SECRET',
    !DATABASE_URL && 'DATABASE_URL'
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    staticClientFilesPath: CLIENT_RELATIVE_STATIC_PATH!,
    PORT: PORT!,
    SERVER_BASE_URL: SERVER_BASE_URL!,
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET!,
    DATABASE_URL: DATABASE_URL!
  };
};

let cached: EnvData | undefined;

@Injectable()
export class ConfigRepository {

    constructor() {}

    getEnv() : EnvData {
        if (!cached) {
            cached = getEnv();
        }
        
        return cached; 
    }
}

export const clearCachedEnv = () => {
    cached = undefined;
};