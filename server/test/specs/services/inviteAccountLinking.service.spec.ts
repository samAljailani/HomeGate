import { Test, TestingModule } from '@nestjs/testing'
import { InviteAccountLinkingService } from '@/api/services/inviteAccountLinking.service'
import { IUserAccountRepository } from '@/data/repositories/IUserAccountRepository'
import { ApplicationClientRegistry } from '@/core/clients/applicationClientRegistry'
import { LoggingProvider } from '@/infrastructure/logger.provider'
import { ApplicationClientNames, UserAccountStatus } from '@/types/enums'
import { InviteAccountModel } from '@/types/models/invite'
import { createLoggerMock } from '../../mocks/logger.provider.mock'
import { createUserAccountRepositoryMock } from '../../mocks/userAccount.repository.mock'
import { createApplicationClientRegistryMock } from '../../mocks/applicationClientRegistry.mock'

describe('InviteAccountLinkingService', () => {
    let service: InviteAccountLinkingService
    let loggerMock: ReturnType<typeof createLoggerMock>
    let userAccountRepoMock: ReturnType<typeof createUserAccountRepositoryMock>
    let registryMock: ReturnType<typeof createApplicationClientRegistryMock>

    beforeEach(async () => {
        loggerMock = createLoggerMock()
        userAccountRepoMock = createUserAccountRepositoryMock()
        registryMock = createApplicationClientRegistryMock()

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InviteAccountLinkingService,
                { provide: LoggingProvider, useValue: loggerMock },
                { provide: IUserAccountRepository, useValue: userAccountRepoMock },
                { provide: ApplicationClientRegistry, useValue: registryMock },
            ],
        }).compile()

        service = module.get<InviteAccountLinkingService>(InviteAccountLinkingService)
    })

    const makeAccount = (overrides: Partial<InviteAccountModel> = {}): InviteAccountModel => ({
        id: 'ia-1',
        inviteId: 'inv-1',
        serviceId: 5,
        serviceName: ApplicationClientNames.Jellyfin,
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
        userAccountRepoMock.findMany.mockResolvedValue([])
        userAccountRepoMock.create.mockResolvedValue(null)

        const event = { userId: 'user-1', accounts: [account] }
        await service.handleInviteClaimed(event)

        expect(clientMock.getUser).toHaveBeenCalledWith({
            username: 'juser',
            email: undefined,
            userServiceAccountId: undefined,
        })
        expect(userAccountRepoMock.findMany).toHaveBeenCalledWith({
            serviceId: 5,
            userServiceAccountId: 'ext-1',
        })
        expect(userAccountRepoMock.create).toHaveBeenCalledWith({
            userId: 'user-1',
            serviceId: 5,
            username: 'juser',
            userServiceAccountId: 'ext-1',
            status: UserAccountStatus.active,
            autoRenew: true
        })
    })

    it('logs and skips when external account does not exist', async () => {
        const account = makeAccount()
        const clientMock = { getUser: jest.fn().mockResolvedValue({ ok: false, user: null }) }
        registryMock.has.mockReturnValue(true)
        registryMock.get.mockReturnValue(clientMock as never)

        const event = { userId: 'user-1', username: 'homeuser', accounts: [account] }
        await service.handleInviteClaimed(event)

        expect(userAccountRepoMock.create).not.toHaveBeenCalled()
        expect(loggerMock.log).toHaveBeenCalledWith(expect.stringContaining('No existing account found'))
    })

    it('skips when the service client is not registered', async () => {
        const account = makeAccount()
        registryMock.has.mockReturnValue(false)

        const event = { userId: 'user-1', username: 'homeuser', accounts: [account] }
        await service.handleInviteClaimed(event)

        expect(registryMock.get).not.toHaveBeenCalled()
        expect(userAccountRepoMock.create).not.toHaveBeenCalled()
        expect(loggerMock.warn).toHaveBeenCalled()
    })

    it('catches errors per account without stopping other accounts', async () => {
        const account1 = makeAccount({ id: 'ia-1', serviceId: 5 })
        const account2 = makeAccount({ id: 'ia-2', serviceId: 6, serviceName: ApplicationClientNames.Immich })
        const clientMock = {
            getUser: jest.fn()
                .mockRejectedValueOnce(new Error('network error'))
                .mockResolvedValueOnce({ ok: true, user: { id: 'ext-3', username: 'iuser' } }),
        }
        registryMock.has.mockReturnValue(true)
        registryMock.get.mockReturnValue(clientMock as never)
        userAccountRepoMock.findMany.mockResolvedValue([])
        userAccountRepoMock.create.mockResolvedValue(null)

        const event = { userId: 'user-1', username: 'homeuser', accounts: [account1, account2] }
        await service.handleInviteClaimed(event)

        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed to link invite account'),
            expect.anything()
        )
        expect(userAccountRepoMock.create).toHaveBeenCalledTimes(1)
    })

    it('skips linking when the external account is already linked to another user', async () => {
        const account = makeAccount()
        const clientMock = { getUser: jest.fn().mockResolvedValue({ ok: true, user: { id: 'ext-1', username: 'juser' } }) }
        registryMock.has.mockReturnValue(true)
        registryMock.get.mockReturnValue(clientMock as never)
        userAccountRepoMock.findMany.mockResolvedValue([{ userId: 'other-user', serviceId: 5 } as never])

        const event = { userId: 'user-1', accounts: [account] }
        await service.handleInviteClaimed(event)

        expect(userAccountRepoMock.create).not.toHaveBeenCalled()
        expect(loggerMock.log).toHaveBeenCalledWith(expect.stringContaining('already linked'))
    })
})
