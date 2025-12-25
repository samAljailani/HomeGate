import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvResponse, EnvData} from '@packages/types';
import { Injectable } from '@nestjs/common';

const getEnv = (): EnvData => {
  const dto = plainToInstance(EnvResponse, process.env);
  console.log
  const errors = validateSync(dto);

  if (errors.length > 0) {
    const messages = [`Invalid environment variables: `];
    for (const error of errors) {
      messages.push(`  - ${error.property}=${error.value} (${Object.values(error.constraints || {}).join(', ')})`);
    }
    throw new Error(messages.join('\n'));
  }

  return {
    staticClientFilesPath: dto.CLIENT_RELATIVE_STATIC_PATH!,
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