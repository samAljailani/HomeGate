import 'dotenv/config'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '@/app.module'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    const port = process.env['PORT'] ? Number(process.env['PORT']) : 3000

    configureSwagger(<NestExpressApplication>app)

    await app.listen(port)
    // eslint-disable-next-line no-console
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
