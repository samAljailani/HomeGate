'use client'

import { useCallback, useMemo, useState } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type VisibilityState,
} from '@tanstack/react-table'
import { InfoIcon, Loader2 } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/context/preferences-context'
import { preferences } from '@/constants/preferences'
import { DataTableColumnToggle, DataTableSortableHead } from '@/components/ui/data-table'
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge'
import type { LogResponseDto } from '@/services/log.service'
import { LogDetailsDialog } from './LogDetailsDialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface LogsTableProps {
    logs: LogResponseDto[]
    isLoading: boolean
    total: number
    hasMore: boolean
    isLoadingMore: boolean
    onLoadMore: () => void
}

const LEVEL_TONES: Record<string, StatusBadgeTone> = {
    verbose: 'neutral',
    debug: 'neutral',
    log: 'info',
    warn: 'warning',
    error: 'error',
    fatal: 'error',
}

function formatDate(value: string): string {
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

function truncate(value: string, length: number): string {
    return value.length > length ? `${value.slice(0, length)}…` : value
}

export function LogsTable({ logs, isLoading, total, hasMore, isLoadingMore, onLoadMore }: LogsTableProps) {
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const [selectedLog, setSelectedLog] = useState<LogResponseDto | null>(null)
    const columnVisibility = getColumnVisibility(preferences.columns.adminLogs)

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminLogs, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<LogResponseDto>[]>(() => [
        {
            id: 'createdAt',
            accessorKey: 'createdAt',
            header: 'Time',
            cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.createdAt)}</span>,
        },
        {
            id: 'logLevel',
            accessorKey: 'logLevel',
            header: 'Level',
            cell: ({ row }) => (
                <StatusBadge tone={LEVEL_TONES[row.original.logLevel] ?? 'neutral'}>
                    {row.original.logLevel}
                </StatusBadge>
            ),
        },
        {
            id: 'context',
            accessorKey: 'context',
            header: 'Context',
            cell: ({ row }) => row.original.context ?? '—',
        },
        {
            id: 'message',
            accessorKey: 'message',
            header: 'Message',
            cell: ({ row }) => truncate(row.original.message, 80),
        },
        {
            id: 'userId',
            accessorKey: 'userId',
            header: 'User',
            cell: ({ row }) => row.original.userId ?? '—',
        },
        {
            id: 'sessionId',
            accessorKey: 'sessionId',
            header: 'Session',
            cell: ({ row }) => row.original.sessionId ?? '—',
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <Button variant="ghost" size="icon-sm" title="View" onClick={() => setSelectedLog(row.original)}>
                    <InfoIcon className="size-4" />
                </Button>
            ),
        },
    ], [])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: logs,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    if (isLoading) {
        return <p className="py-8 text-center text-muted-foreground">Loading logs…</p>
    }

    if (logs.length === 0) {
        return <p className="py-8 text-center text-muted-foreground">No logs found.</p>
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    Showing {logs.length} of {total} log{total === 1 ? '' : 's'}
                </p>
                <DataTableColumnToggle table={table} />
            </div>

            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <DataTableSortableHead key={header.id} header={header} />
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {hasMore && (
                <div className="flex justify-center pt-2">
                    <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
                        {isLoadingMore && <Loader2 className="size-4 animate-spin" />}
                        Load More
                    </Button>
                </div>
            )}

            <LogDetailsDialog
                log={selectedLog}
                open={selectedLog !== null}
                setOpen={(open) => !open && setSelectedLog(null)}
            />
        </div>
    )
}
