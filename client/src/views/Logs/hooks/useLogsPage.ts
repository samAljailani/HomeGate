'use client'

import { useCallback, useEffect, useState } from 'react'
import { logService, type LogListRequestDto, type LogResponseDto } from '@/services/log.service'
import { addToastMessage } from '@/lib/utils'

const PAGE_SIZE = 50

export function useLogsPage() {
    const [logs, setLogs] = useState<LogResponseDto[]>([])
    const [total, setTotal] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<LogListRequestDto>({})

    const load = useCallback(async (query: LogListRequestDto) => {
        try {
            setIsLoading(true)
            setError(null)
            const page = await logService.getAllLogs({ ...query, take: PAGE_SIZE, skip: 0 })
            setLogs(page.data)
            setTotal(page.total)
            setHasMore(page.hasMore)
        } catch {
            setError('Failed to load logs')
            addToastMessage('error', 'Failed to load logs')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load({})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadMore = useCallback(async () => {
        setIsLoadingMore(true)
        try {
            const page = await logService.getAllLogs({ ...filters, take: PAGE_SIZE, skip: logs.length })
            setLogs((prev) => [...prev, ...page.data])
            setTotal(page.total)
            setHasMore(page.hasMore)
        } catch {
            setError('Failed to load more logs')
            addToastMessage('error', 'Failed to load more logs')
        } finally {
            setIsLoadingMore(false)
        }
    }, [filters, logs.length])

    const applyFilters = useCallback((next: LogListRequestDto) => {
        setFilters(next)
        load(next)
    }, [load])

    return {
        logs,
        total,
        hasMore,
        isLoading,
        isLoadingMore,
        error,
        filters,
        applyFilters,
        loadMore,
        refresh: load,
    }
}
