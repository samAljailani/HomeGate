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
import { Pencil, Trash2 } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/context/preferences-context'
import { preferences } from '@/constants/preferences'
import { DataTableColumnToggle, DataTableSortableHead } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { ServicePatchRequestDto, ServiceResponseDto } from '@/services/service.service'
import { ServiceEditDialog } from './ServiceEditDialog'
import { ServiceCreateDialog } from './ServiceCreateDialog'
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
    onUpdate: (slug: string, patch: ServicePatchRequestDto) => Promise<void>
    onCreated: () => void
    onDelete: (slug: string) => Promise<void>
}

function ServiceThumbnail({ service }: { service: ServiceResponseDto }) {
    if (!service.imageUrl) {
        return (
            <div className="flex h-8 w-28 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                {service.name.charAt(0).toUpperCase()}
            </div>
        )
    }

    return <img src={service.imageUrl} alt={service.name} className="h-8 w-28 rounded-md object-contain" />
}

export function ServicesTable({ services, isLoading, pendingName, onUpdate, onCreated, onDelete }: ServicesTableProps) {
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const [editingService, setEditingService] = useState<ServiceResponseDto | null>(null)
    const [deletingService, setDeletingService] = useState<ServiceResponseDto | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const columnVisibility = getColumnVisibility(preferences.columns.adminServices)

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminServices, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<ServiceResponseDto>[]>(() => {
        const serviceNameById = new Map(services.map((s) => [s.id, s.name]))

        return [
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
            id: 'slug',
            accessorKey: 'slug',
            header: 'Slug',
        },
        {
            id: 'url',
            accessorKey: 'url',
            header: 'URL',
            cell: ({ row }) => row.original.url ?? '—',
        },
        {
            id: 'accountType',
            accessorKey: 'accountType',
            header: 'Account Type',
            cell: ({ row }) => (
                <StatusBadge tone={row.original.accountType === 'MANAGED' ? 'info' : 'neutral'}>
                    {row.original.accountType}
                </StatusBadge>
            ),
        },
        {
            id: 'integrationProvider',
            accessorKey: 'integrationProvider',
            header: 'Integration',
            cell: ({ row }) => row.original.accountType === 'MANAGED' ? row.original.integrationProvider ?? '—' : '—',
        },
        {
            id: 'accountSourceService',
            accessorKey: 'accountSourceServiceId',
            header: 'Account Source',
            cell: ({ row }) => {
                const sourceId = row.original.accountSourceServiceId
                return sourceId != null ? serviceNameById.get(sourceId) ?? `#${sourceId}` : '—'
            },
        },
        {
            id: 'defaultAllowed',
            accessorKey: 'defaultAllowed',
            header: 'Default Allowed',
            cell: ({ row }) => (row.original.defaultAllowed ? 'Yes' : 'No'),
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
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Edit"
                        disabled={pendingName === row.original.slug}
                        onClick={() => setEditingService(row.original)}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    {row.original.accountType !== 'MANAGED' && (
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Delete"
                            disabled={pendingName === row.original.slug}
                            onClick={() => setDeletingService(row.original)}
                        >
                            <Trash2 className="size-4 text-destructive" />
                        </Button>
                    )}
                </div>
            ),
        },
    ]}, [pendingName, services])

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

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                    Add Service
                </Button>
                <DataTableColumnToggle table={table} />
            </div>

            {services.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No services found.</p>
            ) : (
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
            )}

            <ServiceEditDialog
                service={editingService}
                open={editingService !== null}
                setOpen={(open) => !open && setEditingService(null)}
                isSaving={pendingName === editingService?.slug}
                onSave={onUpdate}
            />

            <ServiceCreateDialog
                open={createOpen}
                setOpen={setCreateOpen}
                services={services}
                onCreated={onCreated}
            />

            <ConfirmDialog
                open={deletingService !== null}
                setOpen={(open) => !open && setDeletingService(null)}
                title="Delete service?"
                description={`This permanently deletes '${deletingService?.name}' and its access rules. ${deletingService?.accountType === 'REFERENCED' ? 'Its subscriptions are cascade-deleted as well. ' : ''}This cannot be undone.`}
                confirmLabel="Delete Service"
                variant="destructive"
                onConfirm={() => onDelete(deletingService!.slug)}
            />
        </div>
    )
}
