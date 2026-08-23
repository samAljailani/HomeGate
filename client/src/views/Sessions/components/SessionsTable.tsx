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
import { Trash2 } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/context/preferences-context'
import { preferences } from '@/constants/preferences'
import { DataTableColumnToggle, DataTableSortableHead } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import type { SessionResponseDto } from '@/services/session.service'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface SessionsTableProps {
    sessions: SessionResponseDto[]
    isLoading: boolean
    pendingId: string | null
    onRevoke: (id: string) => Promise<void>
}

function formatDate(value?: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function isExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() < Date.now()
}

export function SessionsTable({ sessions, isLoading, pendingId, onRevoke }: SessionsTableProps) {
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const columnVisibility = getColumnVisibility(preferences.columns.adminSessions)

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminSessions, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<SessionResponseDto>[]>(() => [
        {
            id: 'username',
            accessorFn: (row) => row.username ?? undefined,
            sortUndefined: 'last',
            header: 'Username',
            cell: ({ row }) => row.original.username ?? '—',
        },
        {
            id: 'provider',
            accessorFn: (row) => row.provider ?? undefined,
            sortUndefined: 'last',
            header: 'Provider',
            cell: ({ row }) => row.original.provider ?? '—',
        },
        {
            id: 'ipAddress',
            accessorFn: (row) => row.ipAddress ?? undefined,
            sortUndefined: 'last',
            header: 'IP Address',
            cell: ({ row }) => row.original.ipAddress ?? '—',
        },
        {
            id: 'device',
            accessorFn: (row) => row.device ?? undefined,
            sortUndefined: 'last',
            header: 'Device',
            cell: ({ row }) => row.original.device ?? '—',
        },
        {
            id: 'browser',
            accessorFn: (row) => row.browser ?? undefined,
            sortUndefined: 'last',
            header: 'Browser',
            cell: ({ row }) => row.original.browser ?? '—',
        },
        {
            id: 'createdAt',
            accessorFn: (row) => new Date(row.createdAt).getTime(),
            header: 'Created',
            cell: ({ row }) => formatDate(row.original.createdAt),
        },
        {
            id: 'expiresAt',
            accessorFn: (row) => new Date(row.expiresAt).getTime(),
            header: 'Expires',
            cell: ({ row }) => formatDate(row.original.expiresAt),
        },
        {
            id: 'status',
            accessorFn: (row) => (isExpired(row.expiresAt) ? 0 : 1),
            header: 'Status',
            cell: ({ row }) => (
                <StatusBadge tone={isExpired(row.original.expiresAt) ? 'neutral' : 'success'}>
                    {isExpired(row.original.expiresAt) ? 'Expired' : 'Active'}
                </StatusBadge>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => {
                const session = row.original
                const isPending = pendingId === session.id
                return (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Revoke session"
                        disabled={isPending}
                        onClick={() => onRevoke(session.id)}
                    >
                        <Trash2 className="size-4 text-red-600" />
                    </Button>
                )
            },
        },
    ], [onRevoke, pendingId])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: sessions,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    if (isLoading) return <p className="py-8 text-center text-muted-foreground">Loading sessions…</p>
    if (sessions.length === 0) return <p className="py-8 text-center text-muted-foreground">No sessions found.</p>

    return (
        <div className="space-y-2">
            <div className="flex justify-end"><DataTableColumnToggle table={table} /></div>
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => <DataTableSortableHead key={header.id} header={header} />)}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
