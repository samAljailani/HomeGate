import { Module } from '@nestjs/common'
import { controllers } from '@/api/controllers'
import { strategies } from '@/api/middleware/strategies'
import { EnvRepository } from '@/data/repositories/env.repository'
import { ThrottlerModule } from '@nestjs/throttler'
import { services } from '@/api/services'
import { middleware } from '@/api/middleware'
import { repositories } from '@/data/repositories'
import { providers } from '@/infrastructure'
import { clients } from './core/clients'
import { ClsModule } from 'nestjs-cls'
import { ApplicationClientRegistry } from './core/clients/applicationClientRegistry'
import { ScheduleModule } from '@nestjs/schedule'
import { DiscoveryModule } from '@nestjs/core'

const configRepository: EnvRepository = new EnvRepository()
const env = configRepository.getEnv()

@Module({
    imports: [
        ScheduleModule.forRoot(),
        DiscoveryModule,
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
    providers: [
        ...repositories,
        ...providers,
        ...services,
        ...strategies,
        ...middleware,
        ...clients,
        ApplicationClientRegistry,
    ],
})
export class AppModule {}
