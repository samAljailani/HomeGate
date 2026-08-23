export interface CreateImmichUserRequestDto {
    email: string
    name: string
    password: string
}

export interface ImmichUserResponse {
    id: string
    email?: string
    name?: string
    isAdmin?: boolean
    deletedAt?: string | null
}

export const immichEndpoints = Object.freeze({
    createUser: '/admin/users',
    getUser: (userId: string) => `/admin/users/${userId}`,
    getAllUsers: (withDeleted: string) => `/admin/users?withDeleted=${withDeleted}`, //TODO include with deleted query parameter
    restoreUser: (userId: string) => `/admin/users/${userId}/restore`,
    updateUser: (userId: string) => `/admin/users/${userId}`,
    deleteUser: (userId: string) => `/admin/users/${userId}`,
})
