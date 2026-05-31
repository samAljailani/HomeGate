import { ConfigRepository } from '@/repositories/config.repository'
import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/generated'

@Injectable()
export class PrismaProvider extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(@Inject(ConfigRepository) configRepository: ConfigRepository) {
        const databaseUrl = configRepository.getEnv().database.url
        const adapter = new PrismaPg({ connectionString: databaseUrl })
        super({ adapter })
    }

    async onModuleInit() {
        await this.$connect()
    }

    async onModuleDestroy() {
        await this.$disconnect()
    }
}
