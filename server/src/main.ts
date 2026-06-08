import 'dotenv/config'
import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import session from 'express-session'

import { AppModule } from '@/app.module'
import { AppEnv } from '@/types/models/EnvData'

import { PrismaSessionStore } from '@/infrastructure/prismaSession.store'
import { ConfigRepository } from '@/data/repositories/config.repository'
import { csrfSynchronisedProtection } from '@/api/security/csrf'

import { ApplicationClientRegistry } from './core/clients/applicationClientRegistry'
import { clients } from './core/clients'

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)

    const sessionStore = app.get(PrismaSessionStore)
    const configRepository = app.get(ConfigRepository)

    await configureApplicationClients(app)

    const env = configRepository.getEnv()

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
        }),
    )

    const port = env.port

    configureSwagger(app)

    await app.listen(port)

    console.log(`Server listening on http://localhost:${port}`)
}

async function configureApplicationClients(app: NestExpressApplication) {
    const applicationClientRegistry = app.get(ApplicationClientRegistry)

    for(let client of clients){
        await applicationClientRegistry.register(app.get(client))
    }
}

function configureSwagger(app: NestExpressApplication) {
    const config = new DocumentBuilder()
        .setTitle('HomeGate API')
        .setDescription('API documentation for HomeGate')
        .setVersion('1.0')
        .addApiKey(
            {
                type: 'apiKey',
                name: 'X-CSRF-Token',
                in: 'header',
                description: 'CSRF token from GET /api/csrf',
            },
            'csrf-token',
        )
        .addSecurityRequirements('csrf-token')
        .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
}

bootstrap()