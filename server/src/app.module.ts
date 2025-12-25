import { Module } from '@nestjs/common'
import { TestController } from './controllers/test.controller'
import { TestService } from './services/test.service'
import { ConfigRepository } from './repositories/config.repository';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

const configRepository : ConfigRepository = new ConfigRepository();
@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, configRepository.getEnv().staticClientFilesPath),
            })
    ],
    controllers: [TestController],
    providers: [TestService],
})
export class AppModule {}
