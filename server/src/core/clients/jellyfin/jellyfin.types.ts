export interface CreateJellyfinUserRequestDto {
    Name: string
    Password: string
}

export interface JellyfinUserResponse {
    Id: string
    Name: string
    Policy?: {
        IsAdministrator?: boolean
        IsDisabled?: boolean
    }
}

export const jellyfinEndpoints = Object.freeze({
    createUser: '/Users/New',
    getUser: (userId: string) => `/Users/${userId}`,
    getAllUsers: '/Users',
    updateUserPolicy: (userId: string) => `/Users/${userId}/Policy`,
    deleteUser: (userId: string) => `/Users/${userId}`,
})
