import { Module } from '@nestjs/common'
import { controllers } from '@/api/controllers'
import { strategies } from '@/api/middleware/strategies'
import { ConfigRepository } from '@/data/repositories/config.repository'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ThrottlerModule } from '@nestjs/throttler'
import { resolve } from 'path'
import { services } from '@/api/services'
import { middleware } from '@/api/middleware'
import { repositories } from '@/data/repositories'
import { providers } from '@/infrastructure'
import { clients } from './core/clients'
import { ClsModule } from 'nestjs-cls'

const configRepository: ConfigRepository = new ConfigRepository()
const env = configRepository.getEnv()

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: resolve(process.cwd(), env.client.buildPath),
        }),
        ClsModule.forRoot(env.cls.config),
        ThrottlerModule.forRoot([
            {
                name: 'default',
                ttl: 60_000,
                limit: 100,
            },
        ]),
    ],
    controllers: [...controllers],
    providers: [...repositories, ...providers, ...services, ...strategies, ...middleware, ...clients],
})
export class AppModule {}
