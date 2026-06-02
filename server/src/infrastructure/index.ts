import { Provider } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { PrismaSessionStore } from './prismaSession.store'
import { LoggingProvider } from './logger.provider'
import { GlobalExceptionFilter } from './global-exception.filter'

export const providers: Provider[] = [
    CryptographyProvider,
    PrismaProvider,
    PrismaSessionStore,
    LoggingProvider,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
]
