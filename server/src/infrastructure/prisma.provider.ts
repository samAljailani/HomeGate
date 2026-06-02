import { ConfigRepository } from '@/repositories/config.repository'
import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/generated'

@Injectable()
export class PrismaProvider extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaProvider.name)

    constructor(@Inject(ConfigRepository) configRepository: ConfigRepository) {
        const databaseUrl = configRepository.getEnv().database.url
        const adapter = new PrismaPg({ connectionString: databaseUrl })
        super({ adapter })
    }

    async onModuleInit() {
        try {
            await this.$connect()
        } catch (error) {
            this.logger.fatal(`Failed to connect to the database: ${error instanceof Error ? error.message : error}`)
            throw error
        }
    }

    async onModuleDestroy() {
        await this.$disconnect()
    }
}
