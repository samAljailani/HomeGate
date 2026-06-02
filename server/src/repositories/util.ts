import { Prisma } from "@prisma/generated"
import {
    BadRequestException,
    ConflictException,
    InternalServerErrorException,
    NotFoundException,
    ServiceUnavailableException,
} from "@nestjs/common"
type PrismaErrorMessages = {
    conflict?: string
    notFound?: string
    badRequest?: string
    unavailable?: string
    fallback?: string
}

export function mapPrismaError(
    error: unknown,
    messages: PrismaErrorMessages = {},
): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                throw new ConflictException(
                    messages.conflict ?? 'Record already exists',
                )

            case 'P2003':
            case 'P2014':
                throw new ConflictException(
                    messages.conflict ?? 'Operation violates a related record constraint',
                )

            case 'P2000':
            case 'P2005':
            case 'P2006':
            case 'P2011':
            case 'P2012':
            case 'P2013':
            case 'P2020':
                throw new BadRequestException(
                    messages.badRequest ?? 'Invalid data for database operation',
                )

            case 'P2025':
                throw new NotFoundException(
                    messages.notFound ?? 'Record not found',
                )

            case 'P2024':
            case 'P2034':
                throw new ServiceUnavailableException(
                    messages.unavailable ?? 'Database is temporarily unavailable',
                )

            default:
                throw new InternalServerErrorException(
                    messages.fallback ?? 'Database operation failed',
                )
        }
    }

    throw error
}