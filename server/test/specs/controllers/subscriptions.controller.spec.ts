import { Test, TestingModule } from '@nestjs/testing'
import { SubscriptionController } from '@/api/controllers/subscriptions.controller'
import { SubscriptionService } from '@/api/services/subscriptions.service'
import { createRequestMock } from '../../mocks/httpContext.mock'
import { createUserAccountFixture } from '../../fixtures/userAccount.stub'

function createSubscriptionServiceMock(): jest.Mocked<
    Pick<SubscriptionService, 'subscribe' | 'delete' | 'update' | 'renew' | 'getById' | 'listAll' | 'listByUser'>
> {
    return {
        subscribe: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        renew: jest.fn(),
        getById: jest.fn(),
        listAll: jest.fn(),
        listByUser: jest.fn(),
    }
}

describe('SubscriptionController — update / renew / getById / delete / listAll / listMine', () => {
    let controller: SubscriptionController
    let subscriptionServiceMock: ReturnType<typeof createSubscriptionServiceMock>

    const subscriptionId = 'subscription-uuid-1'

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
        it('calls subscriptionService.renew with the subscription id', async () => {
            const account = createUserAccountFixture()
            subscriptionServiceMock.renew.mockResolvedValue(account)

            await controller.renew(subscriptionId)

            expect(subscriptionServiceMock.renew).toHaveBeenCalledWith(subscriptionId)
        })

        it('returns the updated account', async () => {
            const account = createUserAccountFixture()
            subscriptionServiceMock.renew.mockResolvedValue(account)

            const result = await controller.renew(subscriptionId)

            expect(result).toBe(account)
        })
    })

    // #endregion renew

    // #region update

    describe('update', () => {
        it('forwards the policy object to the service', async () => {
            const account = createUserAccountFixture({ autoRenew: true })
            subscriptionServiceMock.update.mockResolvedValue(account)

            await controller.update(subscriptionId, { enabled: true, autoRenew: true })

            expect(subscriptionServiceMock.update).toHaveBeenCalledWith(subscriptionId, {
                enabled: true,
                autoRenew: true,
            })
        })

        it('returns the updated account', async () => {
            const account = createUserAccountFixture({ autoRenew: false })
            subscriptionServiceMock.update.mockResolvedValue(account)

            const result = await controller.update(subscriptionId, { autoRenew: false })

            expect(result).toBe(account)
        })
    })

    // #endregion update

    // #region getById

    describe('getById', () => {
        it('returns the subscription from the service', async () => {
            const account = createUserAccountFixture()
            subscriptionServiceMock.getById.mockResolvedValue(account)

            const result = await controller.getById(subscriptionId)

            expect(subscriptionServiceMock.getById).toHaveBeenCalledWith(subscriptionId)
            expect(result).toBe(account)
        })
    })

    // #endregion getById

    // #region delete

    describe('delete', () => {
        it('calls delete with the id, session user, and immediate flag', async () => {
            const req = createRequestMock()
            req.session.userId = 'session-user-uuid'
            subscriptionServiceMock.delete.mockResolvedValue(true)

            await controller.delete(subscriptionId, { immediate: true }, req)

            expect(subscriptionServiceMock.delete).toHaveBeenCalledWith(subscriptionId, 'session-user-uuid', true)
        })

        it('passes immediate as undefined when not provided', async () => {
            const req = createRequestMock()
            req.session.userId = 'session-user-uuid'
            subscriptionServiceMock.delete.mockResolvedValue(true)

            await controller.delete(subscriptionId, {}, req)

            expect(subscriptionServiceMock.delete).toHaveBeenCalledWith(subscriptionId, 'session-user-uuid', undefined)
        })
    })

    // #endregion delete

    // #region listAll

    describe('listAll', () => {
        it('returns all subscriptions', async () => {
            const accounts = [createUserAccountFixture(), createUserAccountFixture({ userId: 'b' })]
            subscriptionServiceMock.listAll.mockResolvedValue(accounts)

            const result = await controller.listAll({})

            expect(subscriptionServiceMock.listAll).toHaveBeenCalled()
            expect(result).toHaveLength(2)
        })

        it('filters by userId when the query param is provided', async () => {
            const userId = 'user-uuid-1'
            const accounts = [createUserAccountFixture({ userId })]
            subscriptionServiceMock.listByUser.mockResolvedValue(accounts)

            const result = await controller.listAll({ userId })

            expect(subscriptionServiceMock.listByUser).toHaveBeenCalledWith(userId, undefined, undefined)
            expect(subscriptionServiceMock.listAll).not.toHaveBeenCalled()
            expect(result).toHaveLength(1)
        })
    })

    // #endregion listAll

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
