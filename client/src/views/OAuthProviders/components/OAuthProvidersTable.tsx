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
import { Pencil } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/context/preferences-context'
import { preferences } from '@/constants/preferences'
import { DataTableColumnToggle, DataTableSortableHead } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import type { OAuthProviderResponseDto } from '@/services/oauthProvider.service'
import { OAuthProviderEditDialog } from './OAuthProviderEditDialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface OAuthProvidersTableProps {
    providers: OAuthProviderResponseDto[]
    isLoading: boolean
    pendingId: number | null
    onSetEnabled: (id: number, enabled: boolean) => Promise<void>
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function OAuthProvidersTable({ providers, isLoading, pendingId, onSetEnabled }: OAuthProvidersTableProps) {
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const [editingProvider, setEditingProvider] = useState<OAuthProviderResponseDto | null>(null)
    const columnVisibility = getColumnVisibility(preferences.columns.adminOAuthProviders)

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminOAuthProviders, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<OAuthProviderResponseDto>[]>(() => [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Provider',
            cell: ({ row }) => capitalize(row.original.name),
        },
        {
            id: 'status',
            accessorKey: 'enabled',
            header: 'Status',
            cell: ({ row }) => (
                <StatusBadge tone={row.original.enabled ? 'success' : 'neutral'}>
                    {row.original.enabled ? 'Enabled' : 'Disabled'}
                </StatusBadge>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Edit"
                    disabled={pendingId === row.original.id}
                    onClick={() => setEditingProvider(row.original)}
                >
                    <Pencil className="size-4" />
                </Button>
            ),
        },
    ], [pendingId])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: providers,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    if (isLoading) {
        return <p className="py-8 text-center text-muted-foreground">Loading OAuth providers…</p>
    }

    if (providers.length === 0) {
        return <p className="py-8 text-center text-muted-foreground">No OAuth providers found.</p>
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-end">
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

            <OAuthProviderEditDialog
                provider={editingProvider}
                open={editingProvider !== null}
                setOpen={(open) => !open && setEditingProvider(null)}
                isSaving={pendingId === editingProvider?.id}
                onSave={onSetEnabled}
            />
        </div>
    )
}
