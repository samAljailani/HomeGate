'use client'

import { useLogsPage } from './hooks/useLogsPage'
import { LogsFilters } from './components/LogsFilters'
import { LogsTable } from './components/LogsTable'

export function AdminLogs() {
    const { logs, total, hasMore, isLoading, isLoadingMore, applyFilters, loadMore } = useLogsPage()

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Logs</h1>
                <p className="mt-1 text-sm text-muted-foreground">Search and inspect application logs.</p>
            </div>

            <LogsFilters isLoading={isLoading} onApply={applyFilters} />

            <LogsTable
                logs={logs}
                isLoading={isLoading}
                total={total}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMore}
            />
        </div>
    )
}
