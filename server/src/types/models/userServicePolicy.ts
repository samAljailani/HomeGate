import { PolicyEffect } from '@/types/enums'

export type UserServicePolicyModel = {
    id: string
    userId: string
    serviceId: number
    effect: PolicyEffect
    createdByUserId: string | null
    createdAt: Date
}

export type CreateUserServicePolicyModel = Omit<UserServicePolicyModel, 'id' | 'createdAt'>
