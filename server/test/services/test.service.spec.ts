// test.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { TestService } from '../../src/services/test.service'

describe('TestService', () => {
    let service: TestService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TestService],
        }).compile()

        service = module.get<TestService>(TestService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    it('should return the correct message', () => {
        expect(service.getMessage()).toEqual({
            message: 'Hello from TestService',
        })
    })
})
