import { Module } from '@nestjs/common'
import { controllers } from '@/controllers'
import { strategies } from '@/strategies'
import { ConfigRepository } from '@/repositories/config.repository'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ThrottlerModule } from '@nestjs/throttler'
import { resolve } from 'path'
import { services } from '@/services'
import { middleware } from '@/middleware'
import { repositories } from '@/repositories'
import { providers } from '@/infrastructure'
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
    providers: [...repositories, ...providers, ...services, ...strategies, ...middleware],
})
export class AppModule {}
