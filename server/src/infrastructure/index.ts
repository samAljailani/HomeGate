import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { PrismaSessionStore } from './prismaSession.store'
import { CryptographyProvider } from '@/infrastructure/cryptography.provider'

export const providers = [
    CryptographyProvider,
    PrismaProvider,
    PrismaSessionStore,
]