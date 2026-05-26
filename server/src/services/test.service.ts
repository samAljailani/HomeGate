import { Injectable } from '@nestjs/common'

@Injectable()
export class TestService {
    getMessage(): { message: string } {
        return { message: 'Hello from TestService' }
    }

    getProtectedMessage(userId: string): {
        message: string
        userId: string
        timestamp: string
    } {
        return {
            message: 'You are authenticated! This is a protected endpoint.',
            userId,
            timestamp: new Date().toISOString(),
        }
    }
}
