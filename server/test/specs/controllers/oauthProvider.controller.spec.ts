import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { OAuthProviderController } from '@/api/controllers/oauthProvider.controller'
import { OAuthProviderManagementService } from '@/api/services/oauthProviderManagement.service'
import { PaginatedResponseDto } from '@/types/dtos/paginationDto'
import { createOAuthProviderFixture } from '../../fixtures/oauthProvider.stub'

function createOAuthProviderManagementServiceMock(): jest.Mocked<
    Pick<OAuthProviderManagementService, 'list' | 'updateEnabledById'>
> {
    return {
        list: jest.fn(),
        updateEnabledById: jest.fn(),
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
            oauthProviderManagementMock.list.mockResolvedValue(
                new PaginatedResponseDto(providers, 2, 0)
            )

            const result = await controller.list({})

            expect(oauthProviderManagementMock.list).toHaveBeenCalled()
            expect(result.data).toHaveLength(2)
            expect(result.data[0]).toEqual({ id: 1, name: providers[0]!.name, enabled: true })
            expect(result.data[1]).toEqual({ id: 2, name: providers[1]!.name, enabled: false })
        })
    })

    // #endregion list

    // #region update

    describe('update', () => {
        it('calls updateEnabledById with id and true when enabled is true', async () => {
            const provider = createOAuthProviderFixture({ id: 1, enabled: true })
            oauthProviderManagementMock.updateEnabledById.mockResolvedValue(provider)

            await controller.update({ id: 1 }, { enabled: true })

            expect(oauthProviderManagementMock.updateEnabledById).toHaveBeenCalledWith(1, true)
        })

        it('calls updateEnabledById with id and false when enabled is false', async () => {
            const provider = createOAuthProviderFixture({ id: 1, enabled: false })
            oauthProviderManagementMock.updateEnabledById.mockResolvedValue(provider)

            await controller.update({ id: 1 }, { enabled: false })

            expect(oauthProviderManagementMock.updateEnabledById).toHaveBeenCalledWith(1, false)
        })

        it('returns the mapped DTO', async () => {
            const provider = createOAuthProviderFixture({ id: 1, enabled: true })
            oauthProviderManagementMock.updateEnabledById.mockResolvedValue(provider)

            const result = await controller.update({ id: 1 }, { enabled: true })

            expect(result).toEqual({ id: 1, name: provider.name, enabled: true })
        })

        it('throws BadRequestException when no fields provided', async () => {
            await expect(controller.update({ id: 1 }, {})).rejects.toThrow(BadRequestException)
        })
    })

    // #endregion update
})
