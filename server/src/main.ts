import 'dotenv/config'
import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { SwaggerModule } from '@nestjs/swagger'

import session from 'express-session'
import { type Request, type Response, type NextFunction } from 'express'

import { AppModule } from '@/app.module'
import { AppEnv } from '@/types/models/EnvData'

import { PrismaSessionStore } from '@/infrastructure/prismaSession.store'
import { EnvRepository } from '@/data/repositories/env.repository'
import { csrfSynchronisedProtection } from '@/api/security/csrf'
import { buildSwaggerConfig } from '@/swagger.config'
import { PaginationRequestDto } from '@/types/dtos/paginationDto'
import { resolve } from 'path'

import { AccountIntegrationRegistry } from './core/integrations/accountIntegrationRegistry'
import { ImageLibraryService } from '@/api/services/imageLibrary.service'
import { ConfigService } from '@/api/services/config.service'
import { routes } from '@/types/dtos/routes'
import { IUserRepository } from '@/data/repositories'
import { UserStatus } from '@/types/models/user'
import { accountIntegrationProviders } from './core/integrations'
import { configureRequestBodyParsing } from '@/api/security/requestBody'

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })

    app.enableShutdownHooks()

    const sessionStore = app.get(PrismaSessionStore)
    const configRepository = app.get(EnvRepository)

    const env = configRepository.getEnv()

    const clientBuildPath = resolve(process.cwd(), env.client.buildPath)
    app.useStaticAssets(resolve(clientBuildPath, '_next'), { prefix: '/_next', index: false })
    const imageLibrary = app.get(ImageLibraryService)
    await imageLibrary.initialize()

    await configureAccountIntegrations(app)

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
            ...(env.session.cookieDomain && { domain: env.session.cookieDomain }),
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

    // Authenticate before accepting the larger image payload. Nest's admin guard also
    // protects the controller; CSRF remains mandatory on all mutations.
    const users = app.get<IUserRepository>(IUserRepository)
    configureRequestBodyParsing(
        app,
        routes.images.basePath,
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const user = req.session?.userId ? await users.findById(req.session.userId) : null
                if (!user || !user.isAdmin || user.status !== UserStatus.ACTIVE) {
                    res.status(403).json({ message: 'Administrator access required.' })
                    return
                }
                next()
            } catch (error) {
                next(error)
            }
        },
        app.get(ConfigService).getImageLibraryConfig().requestBodyLimitBytes
    )

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

async function configureAccountIntegrations(app: NestExpressApplication) {
    const registry = app.get(AccountIntegrationRegistry)

    for (const provider of accountIntegrationProviders) {
        await registry.register(app.get(provider))
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
