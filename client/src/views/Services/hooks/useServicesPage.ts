'use client'

import { useCallback, useEffect, useState } from 'react'
import { serviceService, type ServiceResponseDto } from '@/services/service.service'
import { addToastMessage } from '@/lib/utils'

export function useServicesPage() {
    const [services, setServices] = useState<ServiceResponseDto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            const services = await serviceService.getAllServices()
            setServices(services)
        } catch {
            setError('Failed to load services')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const patchService = useCallback((slug: string, patch: Partial<ServiceResponseDto>) => {
        setServices((prev) => prev.map((s) => s.slug === slug ? { ...s, ...patch } : s))
    }, [])

    const removeService = useCallback(async (slug: string) => {
        try {
            await serviceService.deleteService(slug)
            setServices((prev) => prev.filter((s) => s.slug !== slug))
            addToastMessage('success', 'Service deleted')
        } catch {
            addToastMessage('error', 'Failed to delete service')
            throw new Error('Failed to delete service')
        }
    }, [])

    return {
        services,
        isLoading,
        error,
        refresh: load,
        patchService,
        removeService,
    }
}
