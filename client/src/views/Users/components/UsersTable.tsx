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
import { OctagonXIcon, CircleCheckIcon, Trash2 } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/context/preferences-context'
import { useAuthContext } from '@/context/auth-context'
import { preferences } from '@/constants/preferences'
import { DataTableColumnToggle, DataTableSortableHead } from '@/components/ui/data-table'
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { UserResponseForAdminDto } from '@/services/user.service'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface UsersTableProps {
    users: UserResponseForAdminDto[]
    isLoading: boolean
    pendingId: string | null
    onDisable: (id: string) => void
    onEnable: (id: string) => void
    onSoftDelete: (id: string) => void
    onHardDelete: (id: string) => void
}

type PendingAction = {
    type: 'disable' | 'enable' | 'softDelete' /* | 'hardDelete' */
    user: UserResponseForAdminDto
}

const ACTION_CONFIG: Record<PendingAction['type'], {
    title: string
    description: (user: UserResponseForAdminDto) => string
    confirmLabel: string
    variant?: 'default' | 'destructive'
}> = {
    disable: {
        title: 'Disable user?',
        description: (user) => `${user.username} will lose access until re-enabled.`,
        confirmLabel: 'Disable',
        variant: 'destructive',
    },
    enable: {
        title: 'Enable user?',
        description: (user) => `${user.username} will regain access.`,
        confirmLabel: 'Enable',
    },
    softDelete: {
        title: 'Delete user?',
        description: (user) => `${user.username} will be marked as deleted but can be recovered by an admin.`,
        confirmLabel: 'Delete',
        variant: 'destructive',
    },
    // hardDelete: {
    //     title: 'Permanently delete user?',
    //     description: (user) => `${user.username} and all associated data will be permanently removed. This cannot be undone.`,
    //     confirmLabel: 'Delete Permanently',
    //     variant: 'destructive',
    // },
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

const STATUS_TONES: Record<string, StatusBadgeTone> = {
    ACTIVE: 'success',
    PENDING: 'info',
    DISABLED: 'warning',
    DELETED: 'error',
}

function UserStatusBadge({ status }: { status: string }) {
    const label = status.charAt(0) + status.slice(1).toLowerCase()
    return <StatusBadge tone={STATUS_TONES[status] ?? 'neutral'}>{label}</StatusBadge>
}

export function UsersTable({
    users,
    isLoading,
    pendingId,
    onDisable,
    onEnable,
    onSoftDelete,
    onHardDelete,
}: UsersTableProps) {
    void onHardDelete // hard delete is disabled for now
    const { user: currentUser } = useAuthContext()
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
    const columnVisibility = getColumnVisibility(preferences.columns.adminUsers)

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminUsers, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<UserResponseForAdminDto>[]>(() => [
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
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
        },
        {
            id: 'email',
            accessorKey: 'email',
            header: 'Email',
        },
        {
            id: 'username',
            accessorKey: 'username',
            header: 'Username',
        },
        {
            id: 'firstName',
            accessorKey: 'firstName',
            header: 'First Name',
        },
        {
            id: 'lastName',
            accessorKey: 'lastName',
            header: 'Last Name',
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
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableHiding: false,
            cell: () => null,
        },
    ], [])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: users,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const closeConfirm = () => setPendingAction(null)

    const runPendingAction = () => {
        if (!pendingAction) return
        const { type, user } = pendingAction
        if (type === 'disable') onDisable(user.id)
        if (type === 'enable') onEnable(user.id)
        if (type === 'softDelete') onSoftDelete(user.id)
        // if (type === 'hardDelete') onHardDelete(user.id)
    }

    if (isLoading) {
        return <p className="py-8 text-center text-muted-foreground">Loading users…</p>
    }

    if (users.length === 0) {
        return <p className="py-8 text-center text-muted-foreground">No users found.</p>
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
                    {table.getRowModel().rows.map((row) => {
                        const user = row.original
                        const isPending = pendingId === user.id
                        const isSelf = currentUser?.id === user.id

                        return (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => {
                                    if (cell.column.id === 'actions') {
                                        return (
                                            <TableCell key={cell.id}>
                                                <div className="flex items-center gap-1">
                                                    {!isSelf && (user.status === 'DISABLED' ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Enable"
                                                            disabled={isPending}
                                                            onClick={() => setPendingAction({ type: 'enable', user })}
                                                        >
                                                            <CircleCheckIcon className="size-4 text-green-600" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Disable"
                                                            disabled={isPending || user.status === 'DELETED'}
                                                            onClick={() => setPendingAction({ type: 'disable', user })}
                                                        >
                                                            <OctagonXIcon className="size-4 text-amber-600" />
                                                        </Button>
                                                    ))}
                                                    {!isSelf && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Delete"
                                                            disabled={isPending || user.status === 'DELETED'}
                                                            onClick={() => setPendingAction({ type: 'softDelete', user })}
                                                        >
                                                            <Trash2 className="size-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                    {/* Hard delete is disabled for now.
                                                    {!isSelf && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Delete Permanently"
                                                            disabled={isPending}
                                                            onClick={() => setPendingAction({ type: 'hardDelete', user })}
                                                        >
                                                            <Trash2 className="size-4 text-red-700" />
                                                        </Button>
                                                    )} */}
                                                </div>
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

            <ConfirmDialog
                open={pendingAction !== null}
                setOpen={(open) => !open && closeConfirm()}
                title={pendingAction ? ACTION_CONFIG[pendingAction.type].title : ''}
                description={pendingAction ? ACTION_CONFIG[pendingAction.type].description(pendingAction.user) : ''}
                confirmLabel={pendingAction ? ACTION_CONFIG[pendingAction.type].confirmLabel : ''}
                variant={pendingAction ? ACTION_CONFIG[pendingAction.type].variant : 'default'}
                onConfirm={async () => runPendingAction()}
            />
        </div>
    )
}
