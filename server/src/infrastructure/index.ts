import { PrismaProvider } from '@/infrastructure/prisma.provider'
import { PrismaSessionStore } from './prismaSession.store'

export const providers = [
    PrismaProvider,
]