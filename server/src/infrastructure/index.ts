import { CryptographyProvider } from '@/infrastructure/cryptography.provider'
import { PrismaProvider } from '@/infrastructure/prisma.provider'

import { PrismaSessionStore } from './prismaSession.store'
import { LoggingProvider } from './logger.provider'

export const providers = [CryptographyProvider, PrismaProvider, PrismaSessionStore, LoggingProvider]
