import 'dotenv/config'
import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { SwaggerModule } from '@nestjs/swagger'

import session from 'express-session'

import { AppModule } from '@/app.module'
import { AppEnv } from '@/types/models/EnvData'

import { PrismaSessionStore } from '@/infrastructure/prismaSession.store'
import { EnvRepository } from '@/data/repositories/env.repository'
import { csrfSynchronisedProtection } from '@/api/security/csrf'
import { buildSwaggerConfig } from '@/swagger.config'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { resolve } from 'path'

import { ApplicationClientRegistry } from './core/clients/applicationClientRegistry'
import { clients } from './core/clients'

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)

    app.enableShutdownHooks()

    const sessionStore = app.get(PrismaSessionStore)
    const configRepository = app.get(EnvRepository)

    const env = configRepository.getEnv()

    const clientBuildPath = resolve(process.cwd(), env.client.buildPath)
    app.useStaticAssets(resolve(clientBuildPath, '_next'), { prefix: '/_next', index: false })
    app.useStaticAssets(resolve(clientBuildPath, 'images'), { prefix: '/images', index: false })

    await configureApplicationClients(app)

    const sessionOptions: session.SessionOptions = {
        secret: env.session.secret,
        resave: false,
        saveUninitialized: false,
        name: env.session.cookieName,
        store: sessionStore,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 30,
        },
    }

    if (env.environment === AppEnv.Production) {
        app.set('trust proxy', 1)

        sessionOptions.cookie = {
            ...sessionOptions.cookie,
            secure: true,
        }
    }

    app.use(session(sessionOptions))
    app.use(csrfSynchronisedProtection)

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        })
    )

    const port = env.port

    configureSwagger(app)

    await app.listen(port)

    console.log(`Server listening on http://localhost:${port}`)
}

async function configureApplicationClients(app: NestExpressApplication) {
    const applicationClientRegistry = app.get(ApplicationClientRegistry)

    for (let client of clients) {
        await applicationClientRegistry.register(app.get(client))
    }
}

function configureSwagger(app: NestExpressApplication) {
    const config = buildSwaggerConfig()

    const document = SwaggerModule.createDocument(app, config, { extraModels: [PaginationRequestDto] })
    SwaggerModule.setup('api', app, document, {
        swaggerOptions: {
            withCredentials: true,
        },
    })
}

bootstrap()
