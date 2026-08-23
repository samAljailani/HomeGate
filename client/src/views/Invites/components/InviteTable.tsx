'use client'

import { useState, useMemo, useCallback } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type VisibilityState,
} from '@tanstack/react-table'
import { Copy, Pencil, Trash2, Save, X } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePreferences } from '@/context/preferences-context'
import { preferences } from '@/constants/preferences'
import { DataTableColumnToggle, DataTableSortableHead } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import type { InviteResponseDto } from '@/services/invite.service'
import type { EditingState } from '../hooks/useInviteTable'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface InviteTableProps {
    invites: InviteResponseDto[]
    isLoading: boolean
    editingId: string | null
    editDraft: EditingState | null
    onStartEdit: (invite: InviteResponseDto) => void
    onDiscardEdit: () => void
    onSaveEdit: () => void
    onUpdateDraft: (field: keyof EditingState, value: string | number | boolean) => void
    onDuplicate: (invite: InviteResponseDto) => void
    onDelete: (id: string) => void
}

function formatDate(value?: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function truncateId(id: string): string {
    return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

function InviteStatusBadge({ invite }: { invite: InviteResponseDto }) {
    if (invite.revokedAt) {
        return <StatusBadge tone="error">Revoked</StatusBadge>
    }
    if (invite.usedAt) {
        return <StatusBadge tone="success">Used</StatusBadge>
    }
    if (new Date(invite.expiresAt) < new Date()) {
        return <StatusBadge tone="neutral">Expired</StatusBadge>
    }
    return <StatusBadge tone="info">Pending</StatusBadge>
}



export function InviteTable({
    invites,
    isLoading,
    editingId,
    editDraft,
    onStartEdit,
    onDiscardEdit,
    onSaveEdit,
    onUpdateDraft,
    onDuplicate,
    onDelete,
}: InviteTableProps) {
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const columnVisibility = getColumnVisibility(preferences.columns.adminInvites)

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminInvites, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<InviteResponseDto>[]>(() => [
        {
            id: 'id',
            accessorKey: 'id',
            header: 'ID',
            cell: ({ row }) => (
                <span className="font-mono text-xs" title={row.original.id}>
                    {truncateId(row.original.id)}
                </span>
            ),
        },
        {
            id: 'status',
            accessorFn: (row) => {
                if (row.revokedAt) return 'Revoked'
                if (row.usedAt) return 'Used'
                if (new Date(row.expiresAt) < new Date()) return 'Expired'
                return 'Pending'
            },
            header: 'Status',
            cell: ({ row }) => <InviteStatusBadge invite={row.original} />,
        },
        {
            id: 'email',
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => row.original.email ?? '—',
        },
        {
            id: 'isAdmin',
            accessorKey: 'isAdmin',
            header: 'Admin',
            cell: ({ row }) => row.original.isAdmin ? 'Yes' : 'No',
        },
        {
            id: 'createdAt',
            accessorKey: 'createdAt',
            header: 'Created',
            cell: ({ row }) => formatDate(row.original.createdAt),
        },
        {
            id: 'expiresAt',
            accessorKey: 'expiresAt',
            header: 'Expires',
            cell: ({ row }) => formatDate(row.original.expiresAt),
        },
        {
            id: 'usedAt',
            accessorKey: 'usedAt',
            header: 'Used',
            cell: ({ row }) => formatDate(row.original.usedAt),
        },
        {
            id: 'revokedAt',
            accessorKey: 'revokedAt',
            header: 'Revoked',
            cell: ({ row }) => formatDate(row.original.revokedAt),
        },
        {
            id: 'revokedReason',
            accessorKey: 'revokedReason',
            header: 'Revoke Reason',
            cell: ({ row }) => row.original.revokedReason ?? '—',
        },
        {
            id: 'createdByUsername',
            accessorKey: 'createdByUsername',
            header: 'Created By',
            cell: ({ row }) => row.original.createdByUsername ?? '—',
        },
        {
            id: 'usedByUsername',
            accessorKey: 'usedByUsername',
            header: 'Used By',
            cell: ({ row }) => row.original.usedByUsername ?? '—',
        },
        {
            id: 'revokedByUsername',
            accessorKey: 'revokedByUsername',
            header: 'Revoked By',
            cell: ({ row }) => row.original.revokedByUsername ?? '—',
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableHiding: false,
            cell: () => null,
        },
    ], [])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: invites,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    if (isLoading) {
        return <p className="py-8 text-center text-muted-foreground">Loading invites…</p>
    }

    if (invites.length === 0 && !editDraft?.isNew) {
        return <p className="py-8 text-center text-muted-foreground">No invites found.</p>
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
                    {editDraft?.isNew && (
                        <TableRow>
                            <TableCell className="font-mono text-xs text-muted-foreground">new</TableCell>
                            {table.getVisibleFlatColumns().find(c => c.id === 'status') && (
                                <TableCell>
                                    <StatusBadge tone="info">Pending</StatusBadge>
                                </TableCell>
                            )}
                            {table.getVisibleFlatColumns().find(c => c.id === 'email') && (
                                <TableCell>
                                    <Input type="email" value={editDraft.email} onChange={(e) => onUpdateDraft('email', e.target.value)} className="h-7 text-xs w-40" />
                                </TableCell>
                            )}
                            {table.getVisibleFlatColumns().find(c => c.id === 'isAdmin') && (
                                <TableCell>
                                    <input type="checkbox" checked={editDraft.isAdmin} onChange={(e) => onUpdateDraft('isAdmin', e.target.checked)} className="size-3.5" />
                                </TableCell>
                            )}
                            {table.getVisibleFlatColumns().find(c => c.id === 'createdAt') && <TableCell className="text-muted-foreground">—</TableCell>}
                            {table.getVisibleFlatColumns().find(c => c.id === 'expiresAt') && (
                                <TableCell>
                                    <select
                                        value={editDraft.expiresInDays}
                                        onChange={(e) => onUpdateDraft('expiresInDays', Number(e.target.value))}
                                        className="h-7 rounded-md border border-(--border-default) bg-(--bg-dropdown) px-2 text-xs text-(--text-primary) shadow-xs outline-none"
                                    >
                                        {[1, 3, 7, 30].map((d) => (
                                            <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'}</option>
                                        ))}
                                    </select>
                                </TableCell>
                            )}
                            {table.getVisibleFlatColumns().find(c => c.id === 'usedAt') && <TableCell>—</TableCell>}
                            {table.getVisibleFlatColumns().find(c => c.id === 'revokedAt') && <TableCell>—</TableCell>}
                            {table.getVisibleFlatColumns().find(c => c.id === 'revokedReason') && <TableCell>—</TableCell>}
                            {table.getVisibleFlatColumns().find(c => c.id === 'createdByUsername') && <TableCell>—</TableCell>}
                            {table.getVisibleFlatColumns().find(c => c.id === 'usedByUsername') && <TableCell>—</TableCell>}
                            {table.getVisibleFlatColumns().find(c => c.id === 'revokedByUsername') && <TableCell>—</TableCell>}
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon-sm" onClick={onSaveEdit} title="Save"><Save className="size-4" /></Button>
                                    <Button variant="ghost" size="icon-sm" onClick={onDiscardEdit} title="Discard"><X className="size-4" /></Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                    {table.getRowModel().rows.map((row) => {
                        const invite = row.original
                        const isEditing = editingId === invite.id

                        return (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => {
                                    if (cell.column.id === 'actions') {
                                        return (
                                            <TableCell key={cell.id}>
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon-sm" onClick={onSaveEdit} title="Save"><Save className="size-4" /></Button>
                                                        <Button variant="ghost" size="icon-sm" onClick={onDiscardEdit} title="Discard"><X className="size-4" /></Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon-sm" onClick={() => onDuplicate(invite)} title="Duplicate"><Copy className="size-4" /></Button>
                                                        <Button variant="ghost" size="icon-sm" onClick={() => onStartEdit(invite)} title="Edit"><Pencil className="size-4" /></Button>
                                                        <Button variant="ghost" size="icon-sm" onClick={() => onDelete(invite.id)} title="Delete"><Trash2 className="size-4 text-destructive" /></Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        )
                                    }
                                    if (isEditing) {
                                        return (
                                            <TableCell key={cell.id}>
                                                {renderEditCell(cell.column.id, editDraft, onUpdateDraft)}
                                            </TableCell>
                                        )
                                    }
                                    return (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

function renderEditCell(
    columnId: string,
    editDraft: EditingState | null,
    onUpdateDraft: (field: keyof EditingState, value: string | number | boolean) => void
) {
    switch (columnId) {
        case 'status':
            return (
                <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={editDraft?.revoked ?? false} onChange={(e) => onUpdateDraft('revoked', e.target.checked)} className="size-3.5" />
                    Revoked
                </label>
            )
        case 'email':
            return <Input type="email" value={editDraft?.email ?? ''} onChange={(e) => onUpdateDraft('email', e.target.value)} className="h-7 text-xs w-40" />
        case 'isAdmin':
            return <input type="checkbox" checked={editDraft?.isAdmin ?? false} onChange={(e) => onUpdateDraft('isAdmin', e.target.checked)} className="size-3.5" />
        case 'expiresAt':
            return editDraft?.isNew ? (
                <select
                    value={editDraft?.expiresInDays ?? 7}
                    onChange={(e) => onUpdateDraft('expiresInDays', Number(e.target.value))}
                    className="h-7 rounded-md border border-(--border-default) bg-(--bg-dropdown) px-2 text-xs text-(--text-primary) shadow-xs outline-none"
                >
                    {[1, 3, 7, 30].map((d) => (
                        <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'}</option>
                    ))}
                </select>
            ) : (
                <Input
                    type="datetime-local"
                    value={editDraft?.expiresAt ? editDraft.expiresAt.slice(0, 16) : ''}
                    onChange={(e) => onUpdateDraft('expiresAt', new Date(e.target.value).toISOString())}
                    className="h-7 text-xs w-44"
                />
            )
        default:
            return null
    }
}
