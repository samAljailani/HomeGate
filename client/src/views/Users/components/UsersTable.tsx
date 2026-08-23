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
    onEnable: (id: string, currentStatus: UserResponseForAdminDto['status']) => void
    onSoftDelete: (id: string, currentStatus: UserResponseForAdminDto['status']) => void
    onHardDelete: (id: string, currentStatus: UserResponseForAdminDto['status']) => void
    onSetAdmin: (id: string, admin: boolean) => void
}

type PendingAction =
    | { type: 'disable' | 'enable' | 'softDelete' | 'recover' /* | 'hardDelete' */; user: UserResponseForAdminDto }
    | { type: 'setAdmin'; user: UserResponseForAdminDto; nextAdmin: boolean }

const ACTION_CONFIG: Record<'disable' | 'enable' | 'softDelete' | 'recover', {
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
    recover: {
        title: 'Recover user?',
        description: (user) => `${user.username} will be restored to active status.`,
        confirmLabel: 'Recover',
    },
    // hardDelete: {
    //     title: 'Permanently delete user?',
    //     description: (user) => `${user.username} and all associated data will be permanently removed. This cannot be undone.`,
    //     confirmLabel: 'Delete Permanently',
    //     variant: 'destructive',
    // },
}

function getDialogConfig(action: PendingAction | null): {
    title: string
    description: string
    confirmLabel: string
    variant?: 'default' | 'destructive'
} {
    if (!action) return { title: '', description: '', confirmLabel: '' }

    if (action.type === 'setAdmin') {
        return action.nextAdmin
            ? {
                title: 'Grant admin access?',
                description: `${action.user.username} will gain full admin privileges.`,
                confirmLabel: 'Make Admin',
                variant: 'destructive',
            }
            : {
                title: 'Revoke admin access?',
                description: `${action.user.username} will lose admin privileges.`,
                confirmLabel: 'Remove Admin',
                variant: 'destructive',
            }
    }

    const config = ACTION_CONFIG[action.type]
    return { ...config, description: config.description(action.user) }
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
    onSetAdmin,
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
            cell: ({ row }) => {
                const user = row.original
                const isSelf = currentUser?.id === user.id
                const canGrantAdmin = user.isAdmin || user.status === 'ACTIVE'
                return (
                    <input
                        type="checkbox"
                        checked={user.isAdmin}
                        disabled={isSelf || pendingId === user.id || !canGrantAdmin}
                        onChange={(e) => setPendingAction({ type: 'setAdmin', user, nextAdmin: e.target.checked })}
                        className="size-4"
                    />
                )
            },
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
    ], [currentUser, pendingId])

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
        if (type === 'enable') onEnable(user.id, user.status)
        if (type === 'recover') onEnable(user.id, user.status)
        if (type === 'softDelete') onSoftDelete(user.id, user.status)
        if (type === 'setAdmin') onSetAdmin(user.id, pendingAction.nextAdmin)
        // if (type === 'hardDelete') onHardDelete(user.id, user.status)
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
                                                    {!isSelf && (user.status === 'DELETED' ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Recover"
                                                            disabled={isPending}
                                                            onClick={() => setPendingAction({ type: 'recover', user })}
                                                        >
                                                            <CircleCheckIcon className="size-4 text-green-600" />
                                                        </Button>
                                                    ) : user.status === 'DISABLED' ? (
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
                                                            disabled={isPending}
                                                            onClick={() => setPendingAction({ type: 'disable', user })}
                                                        >
                                                            <OctagonXIcon className="size-4 text-amber-600" />
                                                        </Button>
                                                    ))}
                                                    {!isSelf && user.status !== 'DELETED' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            title="Delete"
                                                            disabled={isPending}
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
                title={getDialogConfig(pendingAction).title}
                description={getDialogConfig(pendingAction).description}
                confirmLabel={getDialogConfig(pendingAction).confirmLabel}
                variant={getDialogConfig(pendingAction).variant}
                onConfirm={async () => runPendingAction()}
            />
        </div>
    )
}
