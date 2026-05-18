import { Module } from '@nestjs/common'
import { controllers } from '@/controllers'
import { strategies } from '@/strategies'
import { ConfigRepository } from '@/repositories/config.repository';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'path';
import { services } from '@/services';
import { middleware } from '@/middleware'
import { repositories } from '@/repositories';
import { providers } from '@/providers';

const configRepository : ConfigRepository = new ConfigRepository();

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: resolve(process.cwd(), configRepository.getEnv().staticClientFilesPath),
            })
    ],
    controllers: [...controllers],
    providers: [...services, ...strategies, ...middleware, ...repositories, ...providers ],
})
export class AppModule {}
