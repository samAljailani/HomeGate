import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC = 'isPublic'
export const IS_ADMIN = 'isAdmin'

export const Public = () => SetMetadata(IS_PUBLIC, true)
export const AdminRoute = () => SetMetadata(IS_ADMIN, true)
