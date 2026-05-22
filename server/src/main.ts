import 'dotenv/config'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '@/app.module'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import { PrismaSessionStore } from './infrastructure/prismaSession.store';
import { ConfigRepository } from './repositories/config.repository';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const sessionStore = app.get(PrismaSessionStore);
    const configRepository = app.get(ConfigRepository);

    const env = configRepository.getEnv();

    //global middleware
    app.use(
        session({
            secret: env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            name: env.SESSION_COOKIE_NAME,
            store: sessionStore
        }),
    );

    const port = process.env['PORT'] ? Number(process.env['PORT']) : 3002

    configureSwagger(<NestExpressApplication>app)

    await app.listen(port)
  
    console.log(`Server listening on http://localhost:${port}`)
}

function configureSwagger(app : NestExpressApplication) {
    const config = new DocumentBuilder()
        .setTitle('HomeGate API')
        .setDescription('API documentation for HomeGate')
        .setVersion('1.0')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
}

bootstrap()
