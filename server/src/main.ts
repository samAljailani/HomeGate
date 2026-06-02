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
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ConfigRepository } from '@/repositories/config.repository'
import { csrfSynchronisedProtection } from '@/security/csrf'

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)

    const sessionStore = app.get(PrismaSessionStore)
    const configRepository = app.get(ConfigRepository)
    const logger = app.get(LoggingProvider)
    logger.setContext('Process')

    process.on('unhandledRejection', (reason: unknown) => {
        logger.fatal(`Unhandled promise rejection: ${reason instanceof Error ? reason.stack : reason}`)
    })

    process.on('uncaughtException', (error: Error) => {
        logger.fatal(`Uncaught exception: ${error.stack}`)
        process.exit(1)
    })

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
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        },
    }

    if (env.environment === AppEnv.Production) {
        app.set('trust proxy', 1)

        sessionOptions.cookie = {
            ...sessionOptions.cookie,
            secure: true,
        }
    }

    // Global middleware
    app.use(session(sessionOptions))
    app.use(csrfSynchronisedProtection)

    // Global validation pipe
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

    //TODO: replace this console.log call with a logger once that infrastrcture is complete.
    console.log(`Server listening on http://localhost:${port}`)
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
            'csrf-token'
        )
        .addSecurityRequirements('csrf-token')
        .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
}

bootstrap()
