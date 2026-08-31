'use client'

import { useCallback, useEffect, useState } from 'react'
import { addToastMessage, getErrorMessage } from '@/lib/utils'
import { policyService, type PolicyEffect } from '@/services/policy.service'
import { serviceService, type ServiceResponseDto } from '@/services/service.service'
import type { UserResponseForAdminDto } from '@/services/user.service'

export type PolicyChoice = PolicyEffect | null

export function useUserServiceAccess(users: UserResponseForAdminDto[]) {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(users[0]?.id ?? null)
    const [services, setServices] = useState<ServiceResponseDto[]>([])
    const [policies, setPolicies] = useState<Map<number, PolicyEffect>>(new Map())
    const [caps, setCaps] = useState<Map<number, number>>(new Map())
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
            .catch((error) =>
                addToastMessage(
                    'error',
                    getErrorMessage(error, 'Failed to load services')
                )
            )
    }, [])

    useEffect(() => {
        if (!selectedUserId) return
        setIsLoading(true)
        policyService
            .listForUser(selectedUserId)
            .then((list) => {
                setPolicies(new Map(list.map((p) => [p.serviceId, p.effect])))
                setCaps(
                    new Map(list.map((p) => [p.serviceId, p.accountsPerService]))
                )
            })
            .catch((error) =>
                addToastMessage(
                    'error',
                    getErrorMessage(error, 'Failed to load access policies')
                )
            )
            .finally(() => setIsLoading(false))
    }, [selectedUserId])

    const applyPolicy = useCallback(
        async (
            serviceId: number,
            effect: PolicyChoice,
            accountsPerService?: number
        ) => {
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
                    setCaps((prev) => {
                        const next = new Map(prev)
                        next.delete(serviceId)
                        return next
                    })
                    addToastMessage('success', 'Policy removed; service default applies')
                } else {
                    const saved = await policyService.set(selectedUserId, {
                        serviceId,
                        effect,
                        accountsPerService,
                    })
                    setPolicies((prev) => new Map(prev).set(serviceId, effect))
                    setCaps((prev) =>
                        new Map(prev).set(serviceId, saved.accountsPerService)
                    )
                    addToastMessage('success', `${effect} policy saved`)
                }
            } catch (error) {
                addToastMessage(
                    'error',
                    getErrorMessage(error, 'Failed to update policy')
                )
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

    const capFor = useCallback(
        (serviceId: number): number => caps.get(serviceId) ?? 1,
        [caps]
    )

    const updateCap = useCallback(
        async (serviceId: number, accountsPerService: number): Promise<boolean> => {
            if (!selectedUserId) return false
            setPendingServiceId(serviceId)
            try {
                const effect = policies.get(serviceId) ?? 'ALLOW'
                const saved = await policyService.set(selectedUserId, {
                    serviceId,
                    effect,
                    accountsPerService,
                })
                setPolicies((prev) => new Map(prev).set(serviceId, saved.effect))
                setCaps((prev) =>
                    new Map(prev).set(serviceId, saved.accountsPerService)
                )
                addToastMessage('success', 'Account limit updated')
                return true
            } catch (error) {
                addToastMessage(
                    'error',
                    getErrorMessage(error, 'Failed to update account limit')
                )
                return false
            } finally {
                setPendingServiceId(null)
            }
        },
        [selectedUserId, policies]
    )

    return {
        selectedUserId,
        setSelectedUserId,
        services,
        isLoading: isLoading || services.length === 0,
        pendingServiceId,
        policies,
        policyFor,
        capFor,
        updateCap,
        applyPolicy,
    }
}