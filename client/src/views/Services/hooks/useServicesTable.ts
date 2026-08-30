'use client'

import { useCallback, useState } from 'react'
import { serviceService, type ServicePatchRequestDto, type ServiceResponseDto } from '@/services/service.service'
import { addToastMessage, getErrorMessage } from '@/lib/utils'

interface ServicesListMutators {
    patchService: (slug: string, patch: Partial<ServiceResponseDto>) => void
}

export function useServicesTable({ patchService }: ServicesListMutators) {
    const [actionError, setActionError] = useState<string | null>(null)
    const [pendingName, setPendingName] = useState<string | null>(null)

    const updateService = useCallback(async (slug: string, patch: ServicePatchRequestDto) => {
        setActionError(null)
        setPendingName(slug)
        try {
            await serviceService.updateService(slug, patch)
            patchService(slug, patch)
            addToastMessage('success', 'Service updated')
        } catch (error) {
            const message = getErrorMessage(error, 'Failed to update service')
            setActionError(message)
            addToastMessage('error', message)
            throw new Error(message, { cause: error })
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
