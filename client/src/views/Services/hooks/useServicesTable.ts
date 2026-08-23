'use client'

import { useCallback, useState } from 'react'
import { serviceService, type ServicePatchRequestDto, type ServiceResponseDto } from '@/services/service.service'
import { addToastMessage } from '@/lib/utils'

interface ServicesListMutators {
    patchService: (name: string, patch: Partial<ServiceResponseDto>) => void
}

export function useServicesTable({ patchService }: ServicesListMutators) {
    const [actionError, setActionError] = useState<string | null>(null)
    const [pendingName, setPendingName] = useState<string | null>(null)

    const updateService = useCallback(async (name: string, patch: ServicePatchRequestDto) => {
        setActionError(null)
        setPendingName(name)
        try {
            await serviceService.updateService(name, patch)
            patchService(name, patch)
            addToastMessage('success', 'Service updated')
        } catch {
            setActionError('Failed to update service')
            addToastMessage('error', 'Failed to update service')
            throw new Error('Failed to update service')
        } finally {
            setPendingName(null)
        }
    }, [patchService])

    return {
        actionError,
        pendingName,
        updateService,
    }
}
