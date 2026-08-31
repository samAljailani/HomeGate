import type { components } from '@samaljailani/homegate-types'

import { apiClient } from './api-client'

export type UserServicePolicyResponseDto =
    components['schemas']['UserServicePolicyResponseDto']
export type PolicyEffect = components['schemas']['PolicyEffect']

/**
 * All user-service-policy (authorization override) API calls live here.
 * Policies are admin-managed per user: an explicit ALLOW/DENY overrides the
 * service's `defaultAllowed`.
 */
class PolicyService {
    async listForUser(userId: string): Promise<UserServicePolicyResponseDto[]> {
        const { data, error } = await apiClient.GET(
            '/api/users/{id}/service-policies',
            { params: { path: { id: userId } } }
        )
        if (error) throw error
        return data
    }

    async set(
        userId: string,
        body: { serviceId: number; effect: PolicyEffect; accountsPerService?: number }
    ): Promise<UserServicePolicyResponseDto> {
        const { data, error } = await apiClient.PATCH(
            '/api/users/{id}/service-policies',
            { params: { path: { id: userId } }, body }
        )
        if (error) throw error
        return data
    }

    async remove(userId: string, serviceId: number): Promise<void> {
        const { error } = await apiClient.DELETE(
            '/api/users/{id}/service-policies/{serviceId}',
            { params: { path: { id: userId, serviceId } } }
        )
        if (error) throw error
    }
}

export const policyService = new PolicyService()