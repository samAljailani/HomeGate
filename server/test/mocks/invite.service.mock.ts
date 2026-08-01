import { InviteService } from '@/api/services/invite.service'

export function createInviteServiceMock(): jest.Mocked<
    Pick<InviteService, 'validateToken' | 'revokeToken' | 'claimToken' | 'createToken' | 'listInvites'>
> {
    return {
        validateToken: jest.fn(),
        revokeToken: jest.fn(),
        claimToken: jest.fn(),
        createToken: jest.fn(),
        listInvites: jest.fn(),
    }
}
