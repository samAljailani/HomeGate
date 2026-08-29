import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { controllers } from '@/api/controllers'
import { strategies } from '@/api/middleware/strategies'
import { EnvRepository } from '@/data/repositories/env.repository'
import { ThrottlerModule } from '@nestjs/throttler'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { services } from '@/api/services'
import { middleware } from '@/api/middleware'
import { repositories } from '@/data/repositories'
import { providers } from '@/infrastructure'
import { accountIntegrationProviders } from './core/integrations'
import { ClsModule } from 'nestjs-cls'
import { AccountIntegrationRegistry } from './core/integrations/accountIntegrationRegistry'
import { ScheduleModule } from '@nestjs/schedule'
import { DiscoveryModule } from '@nestjs/core'
import { SessionClientInfoMiddleware } from '@/api/middleware/sessionClientInfo.middleware'

const configRepository: EnvRepository = new EnvRepository()
const env = configRepository.getEnv()

@Module({
    imports: [
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),
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
        ...accountIntegrationProviders,
        AccountIntegrationRegistry,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(SessionClientInfoMiddleware).forRoutes('*')
    }
}
