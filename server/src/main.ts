import 'dotenv/config'

import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import session from 'express-session'

import { AppModule } from '@/app.module'
import { AppEnv } from '@/types/models/EnvData'

import { PrismaSessionStore } from './infrastructure/prismaSession.store'
import { ConfigRepository } from './repositories/config.repository'

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)

    const sessionStore = app.get(PrismaSessionStore)
    const configRepository = app.get(ConfigRepository)

    const env = configRepository.getEnv()

    const sessionOptions: session.SessionOptions = {
        secret: env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: env.SESSION_COOKIE_NAME,
        store: sessionStore,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        },
    }

    if (env.APP_ENV === AppEnv.Production) {
        app.set('trust proxy', 1)

        sessionOptions.cookie = {
            ...sessionOptions.cookie,
            secure: true,
            sameSite: 'lax',
        }
    }

    // Global middleware
    app.use(session(sessionOptions))

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

    const port = env.PORT

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
        .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
}

bootstrap()
