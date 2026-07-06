import { Test, TestingModule } from '@nestjs/testing'
import { OAuthProviderController } from '@/api/controllers/oauthProvider.controller'
import { OAuthProviderManagementService } from '@/api/services/oauthProviderManagement.service'
import { OAuthProviderActionRequestDto } from '@/types/dtos/oauthProviderDto'
import { createOAuthProviderFixture } from '../../fixtures/oauthProvider.stub'
import { OAuthProviderName } from '@prisma/generated'

function createOAuthProviderManagementServiceMock(): jest.Mocked<
    Pick<OAuthProviderManagementService, 'list' | 'enable' | 'disable'>
> {
    return {
        list: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
    }
}

describe('OAuthProviderController', () => {
    let controller: OAuthProviderController
    let oauthProviderManagementMock: ReturnType<typeof createOAuthProviderManagementServiceMock>

    beforeEach(async () => {
        oauthProviderManagementMock = createOAuthProviderManagementServiceMock()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [OAuthProviderController],
            providers: [{ provide: OAuthProviderManagementService, useValue: oauthProviderManagementMock }],
        }).compile()

        controller = module.get<OAuthProviderController>(OAuthProviderController)
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    // #region list

    describe('list', () => {
        it('returns mapped provider DTOs', async () => {
            const providers = [
                createOAuthProviderFixture({ id: 1, enabled: true }),
                createOAuthProviderFixture({ id: 2, enabled: false }),
            ]
            oauthProviderManagementMock.list.mockResolvedValue(providers)

            const result = await controller.list({})

            expect(oauthProviderManagementMock.list).toHaveBeenCalled()
            expect(result).toHaveLength(2)
            expect(result[0]).toEqual({ id: 1, name: providers[0]!.name, enabled: true })
            expect(result[1]).toEqual({ id: 2, name: providers[1]!.name, enabled: false })
        })
    })

    // #endregion list

    // #region enable

    describe('enable', () => {
        const request: OAuthProviderActionRequestDto = { name: OAuthProviderName.google }

        it('calls oauthProviderManagementService.enable with the name', async () => {
            const provider = createOAuthProviderFixture({ enabled: true })
            oauthProviderManagementMock.enable.mockResolvedValue(provider)

            await controller.enable(request)

            expect(oauthProviderManagementMock.enable).toHaveBeenCalledWith(OAuthProviderName.google)
        })

        it('returns the mapped DTO', async () => {
            const provider = createOAuthProviderFixture({ id: 1, enabled: true })
            oauthProviderManagementMock.enable.mockResolvedValue(provider)

            const result = await controller.enable(request)

            expect(result).toEqual({ id: 1, name: provider.name, enabled: true })
        })
    })

    // #endregion enable

    // #region disable

    describe('disable', () => {
        const request: OAuthProviderActionRequestDto = { name: OAuthProviderName.google }

        it('calls oauthProviderManagementService.disable with the name', async () => {
            const provider = createOAuthProviderFixture({ enabled: false })
            oauthProviderManagementMock.disable.mockResolvedValue(provider)

            await controller.disable(request)

            expect(oauthProviderManagementMock.disable).toHaveBeenCalledWith(OAuthProviderName.google)
        })

        it('returns the mapped DTO', async () => {
            const provider = createOAuthProviderFixture({ id: 1, enabled: false })
            oauthProviderManagementMock.disable.mockResolvedValue(provider)

            const result = await controller.disable(request)

            expect(result).toEqual({ id: 1, name: provider.name, enabled: false })
        })
    })

    // #endregion disable
})
