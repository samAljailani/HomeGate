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
import type { ServicePatchRequestDto, ServiceResponseDto } from '@/services/service.service'
import { ServiceEditDialog } from './ServiceEditDialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface ServicesTableProps {
    services: ServiceResponseDto[]
    isLoading: boolean
    pendingName: string | null
    onUpdate: (name: string, patch: ServicePatchRequestDto) => Promise<void>
}

function ServiceThumbnail({ service }: { service: ServiceResponseDto }) {
    if (!service.imageUrl) {
        return (
            <div className="flex h-8 w-28 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                {service.name.charAt(0).toUpperCase()}
            </div>
        )
    }

    // eslint-disable-next-line @next/next/no-img-element
    return <img src={service.imageUrl} alt={service.name} className="h-8 w-28 rounded-md object-contain" />
}

export function ServicesTable({ services, isLoading, pendingName, onUpdate }: ServicesTableProps) {
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const [editingService, setEditingService] = useState<ServiceResponseDto | null>(null)
    const columnVisibility = getColumnVisibility(preferences.columns.adminServices)

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminServices, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<ServiceResponseDto>[]>(() => [
        {
            id: 'image',
            header: 'Image',
            enableSorting: false,
            cell: ({ row }) => <ServiceThumbnail service={row.original} />,
        },
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Name',
        },
        {
            id: 'url',
            accessorKey: 'url',
            header: 'URL',
            cell: ({ row }) => row.original.url ?? '—',
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
                    disabled={pendingName === row.original.name}
                    onClick={() => setEditingService(row.original)}
                >
                    <Pencil className="size-4" />
                </Button>
            ),
        },
    ], [pendingName])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: services,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    if (isLoading) {
        return <p className="py-8 text-center text-muted-foreground">Loading services…</p>
    }

    if (services.length === 0) {
        return <p className="py-8 text-center text-muted-foreground">No services found.</p>
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

            <ServiceEditDialog
                service={editingService}
                open={editingService !== null}
                setOpen={(open) => !open && setEditingService(null)}
                isSaving={pendingName === editingService?.name}
                onSave={onUpdate}
            />
        </div>
    )
}
