'use client'

import { useCallback, useEffect, useState } from 'react'
import { serviceService, type ServiceResponseDto } from '@/services/service.service'

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

    const patchService = useCallback((name: string, patch: Partial<ServiceResponseDto>) => {
        setServices((prev) => prev.map((s) => s.name === name ? { ...s, ...patch } : s))
    }, [])

    return {
        services,
        isLoading,
        error,
        refresh: load,
        patchService,
    }
}
