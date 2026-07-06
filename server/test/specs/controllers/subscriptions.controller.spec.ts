import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionController } from '@/api/controllers/subscriptions.controller'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { SubscriptionRenewRequestDto, SubscriptionAutoRenewRequestDto } from '@/types/dtos/subscriptionsDto'
import { createRequestMock } from '../../mocks/httpContext.mock'
import { createUserAccountFixture } from '../../fixtures/userAccount.stub'

function createSubscriptionServiceMock(): jest.Mocked<
    Pick<
        SubscriptionService,
        'subscribe' | 'delete' | 'disable' | 'enable' | 'renew' | 'setAutoRenew' | 'listAll' | 'listByUser'
    >
> {
    return {
        subscribe: jest.fn(),
        delete: jest.fn(),
        disable: jest.fn(),
        enable: jest.fn(),
        renew: jest.fn(),
        setAutoRenew: jest.fn(),
        listAll: jest.fn(),
        listByUser: jest.fn(),
    }
}

describe('SubscriptionController — renew / setAutoRenew / listAll / listByUser', () => {
    let controller: SubscriptionController
    let subscriptionServiceMock: ReturnType<typeof createSubscriptionServiceMock>

    beforeEach(async () => {
        subscriptionServiceMock = createSubscriptionServiceMock()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SubscriptionController],
            providers: [{ provide: SubscriptionService, useValue: subscriptionServiceMock }],
        }).compile()

        controller = module.get<SubscriptionController>(SubscriptionController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    // #region renew

    describe('renew', () => {
        const request: SubscriptionRenewRequestDto = { userId: 'user-uuid-1', serviceId: 1 }

        it('calls subscriptionService.renew with userId and serviceId', async () => {
            const account = createUserAccountFixture()
            subscriptionServiceMock.renew.mockResolvedValue(account)

            await controller.renew(request)

            expect(subscriptionServiceMock.renew).toHaveBeenCalledWith('user-uuid-1', 1)
        })

        it('returns the updated account', async () => {
            const account = createUserAccountFixture()
            subscriptionServiceMock.renew.mockResolvedValue(account)

            const result = await controller.renew(request)

            expect(result).toBe(account)
        })
    })

    // #endregion renew

    // #region setAutoRenew

    describe('setAutoRenew', () => {
        it('calls setAutoRenew with true', async () => {
            const request: SubscriptionAutoRenewRequestDto = { userId: 'user-uuid-1', serviceId: 1, autoRenew: true }
            const account = createUserAccountFixture({ autoRenew: true })
            subscriptionServiceMock.setAutoRenew.mockResolvedValue(account)

            await controller.setAutoRenew(request)

            expect(subscriptionServiceMock.setAutoRenew).toHaveBeenCalledWith('user-uuid-1', 1, true)
        })

        it('calls setAutoRenew with false', async () => {
            const request: SubscriptionAutoRenewRequestDto = { userId: 'user-uuid-1', serviceId: 1, autoRenew: false }
            const account = createUserAccountFixture({ autoRenew: false })
            subscriptionServiceMock.setAutoRenew.mockResolvedValue(account)

            await controller.setAutoRenew(request)

            expect(subscriptionServiceMock.setAutoRenew).toHaveBeenCalledWith('user-uuid-1', 1, false)
        })
    })

    // #endregion setAutoRenew

    // #region listAll

    describe('listAll', () => {
        it('returns all subscriptions', async () => {
            const accounts = [createUserAccountFixture(), createUserAccountFixture({ userId: 'b' })]
            subscriptionServiceMock.listAll.mockResolvedValue(accounts)

            const result = await controller.listAll({})

            expect(subscriptionServiceMock.listAll).toHaveBeenCalled()
            expect(result).toHaveLength(2)
        })
    })

    // #endregion listAll

    // #region listByUser

    describe('listByUser', () => {
        const userId = 'user-uuid-1'

        it('calls listByUser with the route param userId', async () => {
            const accounts = [createUserAccountFixture({ userId })]
            subscriptionServiceMock.listByUser.mockResolvedValue(accounts)

            await controller.listByUser(userId, {})

            expect(subscriptionServiceMock.listByUser).toHaveBeenCalledWith(userId, undefined, undefined)
        })

        it('returns the user subscriptions', async () => {
            const accounts = [createUserAccountFixture({ userId })]
            subscriptionServiceMock.listByUser.mockResolvedValue(accounts)

            const result = await controller.listByUser(userId, {})

            expect(result).toHaveLength(1)
        })
    })

    // #endregion listByUser

    // #region listMine

    describe('listMine', () => {
        const userId = 'session-user-uuid'

        it('calls listByUser with the session userId', async () => {
            const req = createRequestMock()
            req.session.userId = userId
            subscriptionServiceMock.listByUser.mockResolvedValue([])

            await controller.listMine(req, {})

            expect(subscriptionServiceMock.listByUser).toHaveBeenCalledWith(userId, undefined, undefined)
        })

        it('returns the accounts for the session user', async () => {
            const req = createRequestMock()
            req.session.userId = userId
            const accounts = [createUserAccountFixture({ userId }), createUserAccountFixture({ userId, serviceId: 2 })]
            subscriptionServiceMock.listByUser.mockResolvedValue(accounts)

            const result = await controller.listMine(req, {})

            expect(result).toHaveLength(2)
        })

        it('forwards take and skip to the service', async () => {
            const req = createRequestMock()
            req.session.userId = userId
            subscriptionServiceMock.listByUser.mockResolvedValue([])

            await controller.listMine(req, { take: 10, skip: 5 })

            expect(subscriptionServiceMock.listByUser).toHaveBeenCalledWith(userId, 10, 5)
        })
    })

    // #endregion listMine
})
