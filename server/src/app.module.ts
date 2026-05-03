import { Module } from '@nestjs/common'
import { controllers } from '@/controllers'
import { ConfigRepository } from '@/repositories/config.repository';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'path';
import { services } from './services';

const configRepository : ConfigRepository = new ConfigRepository();

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: resolve(process.cwd(), configRepository.getEnv().staticClientFilesPath),
            })
    ],
    controllers: [...controllers],
    providers: [...services ],
})
export class AppModule {}
