import { Test, TestingModule } from '@nestjs/testing'
import { InviteAccountLinkingService } from '@/api/services/inviteAccountLinking.service'
import { ISubscriptionRepository } from '@/data/repositories/ISubscriptionRepository'
import { IExternalUserAccountRepository } from '@/data/repositories/IExternalUserAccountRepository'
import { AccountIntegrationRegistry } from '@/core/integrations/accountIntegrationRegistry'
import { SubscriptionCascadeService } from '@/core/subscriptions/subscriptionCascade.service'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { IntegrationProvider, SubscriptionStatus } from '@/types/enums'
import { InviteAccountModel } from '@/types/models/invite'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createSubscriptionFixture } from '../../fixtures/subscription.stub'
import { createSubscriptionRepositoryMock, createExternalUserAccountRepositoryMock } from '../../mocks/subscription.repository.mock'
import { createAccountIntegrationRegistryMock } from '../../mocks/accountIntegrationRegistry.mock'
import { ConfigService } from '@/api/services/config.service'
import { SystemConfigKey } from '@/types/models/SystemConfig'
import { systemDefaults } from '@/data/config.defaults'

describe('InviteAccountLinkingService', () => {
    let service: InviteAccountLinkingService
    let loggerMock: ReturnType<typeof createLoggerMock>
    let subscriptionRepoMock: ReturnType<typeof createSubscriptionRepositoryMock>
    let externalAccountRepoMock: ReturnType<typeof createExternalUserAccountRepositoryMock>
    let registryMock: ReturnType<typeof createAccountIntegrationRegistryMock>

    beforeEach(async () => {
        loggerMock = createLoggerMock()
        subscriptionRepoMock = createSubscriptionRepositoryMock()
        externalAccountRepoMock = createExternalUserAccountRepositoryMock()
        registryMock = createAccountIntegrationRegistryMock()
        const configServiceMock = {
            get: jest.fn((key: SystemConfigKey) => systemDefaults[key]),
        }
        const cascadeMock = {
            onActivated: jest.fn().mockResolvedValue(undefined),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InviteAccountLinkingService,
                { provide: LoggingProvider, useValue: loggerMock },
                { provide: ISubscriptionRepository, useValue: subscriptionRepoMock },
                { provide: IExternalUserAccountRepository, useValue: externalAccountRepoMock },
                { provide: AccountIntegrationRegistry, useValue: registryMock },
                { provide: ConfigService, useValue: configServiceMock },
                { provide: SubscriptionCascadeService, useValue: cascadeMock },
            ],
        }).compile()

        service = module.get<InviteAccountLinkingService>(InviteAccountLinkingService)
    })

    const makeAccount = (overrides: Partial<InviteAccountModel> = {}): InviteAccountModel => ({
        id: 'ia-1',
        inviteId: 'inv-1',
        serviceId: 5,
        serviceName: IntegrationProvider.Jellyfin,
        username: 'juser',
        email: null,
        accountId: null,
        ...overrides,
    })

    it('links an existing external account to the user', async () => {
        const account = makeAccount()
        const clientMock = { getUser: jest.fn().mockResolvedValue({ ok: true, user: { id: 'ext-1', username: 'juser' } }) }
        registryMock.has.mockReturnValue(true)
        registryMock.get.mockReturnValue(clientMock as never)
        externalAccountRepoMock.findMany.mockResolvedValue([])
        subscriptionRepoMock.create.mockResolvedValue(createSubscriptionFixture({ id: 'sub-1', serviceId: 5 }))

        const event = { userId: 'user-1', accounts: [account] }
        await service.handleInviteClaimed(event)

        expect(clientMock.getUser).toHaveBeenCalledWith({
            username: 'juser',
            email: undefined,
            userServiceAccountId: undefined,
        })
        expect(externalAccountRepoMock.findMany).toHaveBeenCalledWith({
            serviceId: 5,
            externalAccountId: 'ext-1',
        })
        expect(subscriptionRepoMock.create).toHaveBeenCalledWith({
            userId: 'user-1',
            serviceId: 5,
            status: SubscriptionStatus.active,
            autoRenew: true,
            expiresAt: expect.any(Date),
            provisionedAt: expect.any(Date),
        })
        expect(externalAccountRepoMock.create).toHaveBeenCalledWith({
            subscriptionId: 'sub-1',
            userId: 'user-1',
            serviceId: 5,
            username: 'juser',
            externalAccountId: 'ext-1',
        })
    })

    it('logs and skips when external account does not exist', async () => {
        const account = makeAccount()
        const clientMock = { getUser: jest.fn().mockResolvedValue({ ok: false, user: null }) }
        registryMock.has.mockReturnValue(true)
        registryMock.get.mockReturnValue(clientMock as never)

        const event = { userId: 'user-1', username: 'homeuser', accounts: [account] }
        await service.handleInviteClaimed(event)

        expect(subscriptionRepoMock.create).not.toHaveBeenCalled()
        expect(loggerMock.log).toHaveBeenCalledWith(expect.stringContaining('No existing account found'))
    })

    it('skips when the service client is not registered', async () => {
        const account = makeAccount()
        registryMock.has.mockReturnValue(false)

        const event = { userId: 'user-1', username: 'homeuser', accounts: [account] }
        await service.handleInviteClaimed(event)

        expect(registryMock.get).not.toHaveBeenCalled()
        expect(subscriptionRepoMock.create).not.toHaveBeenCalled()
        expect(loggerMock.warn).toHaveBeenCalled()
    })

    it('catches errors per account without stopping other accounts', async () => {
        const account1 = makeAccount({ id: 'ia-1', serviceId: 5 })
        const account2 = makeAccount({ id: 'ia-2', serviceId: 6, serviceName: IntegrationProvider.Immich })
        const clientMock = {
            getUser: jest.fn()
                .mockRejectedValueOnce(new Error('network error'))
                .mockResolvedValueOnce({ ok: true, user: { id: 'ext-3', username: 'iuser' } }),
        }
        registryMock.has.mockReturnValue(true)
        registryMock.get.mockReturnValue(clientMock as never)
        externalAccountRepoMock.findMany.mockResolvedValue([])
        subscriptionRepoMock.create.mockResolvedValue(null)

        const event = { userId: 'user-1', username: 'homeuser', accounts: [account1, account2] }
        await service.handleInviteClaimed(event)

        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed to link invite account'),
            expect.anything()
        )
        expect(subscriptionRepoMock.create).toHaveBeenCalledTimes(1)
    })

    it('skips linking when the external account is already linked to another user', async () => {
        const account = makeAccount()
        const clientMock = { getUser: jest.fn().mockResolvedValue({ ok: true, user: { id: 'ext-1', username: 'juser' } }) }
        registryMock.has.mockReturnValue(true)
        registryMock.get.mockReturnValue(clientMock as never)
        externalAccountRepoMock.findMany.mockResolvedValue([{ userId: 'other-user', serviceId: 5 } as never])

        const event = { userId: 'user-1', accounts: [account] }
        await service.handleInviteClaimed(event)

        expect(subscriptionRepoMock.create).not.toHaveBeenCalled()
        expect(loggerMock.log).toHaveBeenCalledWith(expect.stringContaining('already linked'))
    })
})
