import { EnvData } from '@homepage/types';
import { Injectable } from '@nestjs/common';

const getEnv = (): EnvData => {
  const CLIENT_RELATIVE_STATIC_PATH = process.env['CLIENT_RELATIVE_STATIC_PATH'];

  if (!CLIENT_RELATIVE_STATIC_PATH) {
    throw new Error('Invalid environment variables: CLIENT_RELATIVE_STATIC_PATH is required');
  }

  return {
    staticClientFilesPath: CLIENT_RELATIVE_STATIC_PATH,
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