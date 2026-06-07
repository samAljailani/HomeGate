import { LoggingProvider } from '@/infrastructure/logger.provider'
import { Injectable, Inject } from '@nestjs/common'

@Injectable()
export class BaseService {
    constructor(@Inject(LoggingProvider) protected logger: LoggingProvider) {
        logger.setContext(this.constructor.name)
        //logger.setAppName("HomeGate")
    }
}
