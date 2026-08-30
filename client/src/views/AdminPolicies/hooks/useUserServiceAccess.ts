'use client'

import { useCallback, useEffect, useState } from 'react'
import { addToastMessage } from '@/lib/utils'
import { policyService, type PolicyEffect } from '@/services/policy.service'
import { serviceService, type ServiceResponseDto } from '@/services/service.service'
import type { UserResponseForAdminDto } from '@/services/user.service'

export type PolicyChoice = PolicyEffect | null

export function useUserServiceAccess(users: UserResponseForAdminDto[]) {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(users[0]?.id ?? null)
    const [services, setServices] = useState<ServiceResponseDto[]>([])
    const [policies, setPolicies] = useState<Map<number, PolicyEffect>>(new Map())
    const [isLoading, setIsLoading] = useState(true)
    const [pendingServiceId, setPendingServiceId] = useState<number | null>(null)

    useEffect(() => {
        if (users.length > 0 && !users.some((u) => u.id === selectedUserId)) {
            setSelectedUserId(users[0].id)
        }
    }, [users, selectedUserId])

    useEffect(() => {
        serviceService
            .getAllServices()
            .then(setServices)
            .catch(() => addToastMessage('error', 'Failed to load services'))
    }, [])

    useEffect(() => {
        if (!selectedUserId) return
        setIsLoading(true)
        policyService
            .listForUser(selectedUserId)
            .then((list) => setPolicies(new Map(list.map((p) => [p.serviceId, p.effect]))))
            .catch(() => addToastMessage('error', 'Failed to load access policies'))
            .finally(() => setIsLoading(false))
    }, [selectedUserId])

    const applyPolicy = useCallback(
        async (serviceId: number, effect: PolicyChoice) => {
            if (!selectedUserId) return
            setPendingServiceId(serviceId)
            try {
                if (effect === null) {
                    await policyService.remove(selectedUserId, serviceId)
                    setPolicies((prev) => {
                        const next = new Map(prev)
                        next.delete(serviceId)
                        return next
                    })
                    addToastMessage('success', 'Policy removed; service default applies')
                } else {
                    await policyService.set(selectedUserId, { serviceId, effect })
                    setPolicies((prev) => new Map(prev).set(serviceId, effect))
                    addToastMessage('success', `${effect} policy saved`)
                }
            } catch {
                addToastMessage('error', 'Failed to update policy')
            } finally {
                setPendingServiceId(null)
            }
        },
        [selectedUserId]
    )

    const policyFor = useCallback(
        (serviceId: number): PolicyChoice => policies.get(serviceId) ?? null,
        [policies]
    )

    return {
        selectedUserId,
        setSelectedUserId,
        services,
        isLoading: isLoading || services.length === 0,
        pendingServiceId,
        policies,
        policyFor,
        applyPolicy,
    }
}