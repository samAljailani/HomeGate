import { Injectable } from '@nestjs/common'

@Injectable()
export class TestService {
    getMessage(): { message: string } {
        return { message: 'Hello from TestService' }
    }
}
