export interface CreateImmichUserRequestDto {
    email: string
    name: string
    password: string
}

export interface ImmichUserResponse {
    id: string
    email?: string
    name?: string
    deletedAt?: string | null
}

export const immichEndpoints = Object.freeze({
    createUser: '/admin/users',
    getUser: (userId: string) => `/admin/users/${userId}`,
    getAllUsers: (withDeleted: string) => `/admin/users?withDeleted=${withDeleted}`, //TODO include with deleted query parameter
    restoreUser: (userId: string) => `/admin/users/${userId}/restore`,
    deleteUser: (userId: string) => `/admin/users/${userId}`,
})
