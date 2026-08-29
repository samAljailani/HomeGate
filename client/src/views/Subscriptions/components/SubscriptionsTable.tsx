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
import { CircleCheckIcon, OctagonXIcon, RefreshCw, Trash2 } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/context/preferences-context'
import { preferences } from '@/constants/preferences'
import { DataTableColumnToggle, DataTableSortableHead } from '@/components/ui/data-table'
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { SubscriptionResponseDto } from '@/services/subscription.service'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface SubscriptionsTableProps {
    subscriptions: SubscriptionResponseDto[]
    isLoading: boolean
    pendingId: string | null
    onSetEnabled: (id: string, enabled: boolean) => Promise<void>
    onSetAutoRenew: (id: string, autoRenew: boolean) => Promise<void>
    onRenew: (id: string) => Promise<void>
    onCancel: (id: string) => Promise<void>
}

type PendingAction = {
    type: 'disable' | 'cancel'
    subscription: SubscriptionResponseDto
}

const STATUS_TONES: Record<string, StatusBadgeTone> = {
    active: 'success',
    provisioning: 'info',
    enabling: 'info',
    disabling: 'info',
    cancelling: 'info',
    failed: 'error',
    cancelled: 'neutral',
    disabled: 'neutral',
    expired: 'neutral',
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

export function SubscriptionsTable({
    subscriptions,
    isLoading,
    pendingId,
    onSetEnabled,
    onSetAutoRenew,
    onRenew,
    onCancel,
}: SubscriptionsTableProps) {
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
    const [userFilter, setUserFilter] = useState('')
    const [serviceFilter, setServiceFilter] = useState('')
    const columnVisibility = getColumnVisibility(preferences.columns.adminSubscriptions)

    const userOptions = useMemo(() => {
        const seen = new Map<string, string>()
        subscriptions.forEach((s) => {
            seen.set(s.userId, s.userUsername ?? s.userEmail ?? s.userId)
        })
        return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
    }, [subscriptions])

    const serviceOptions = useMemo(() => {
        const seen = new Map<number, string>()
        subscriptions.forEach((s) => {
            seen.set(s.serviceId, s.serviceName ?? String(s.serviceId))
        })
        return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
    }, [subscriptions])

    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter((s) => {
            if (userFilter && s.userId !== userFilter) return false
            if (serviceFilter && String(s.serviceId) !== serviceFilter) return false
            return true
        })
    }, [subscriptions, userFilter, serviceFilter])

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminSubscriptions, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<SubscriptionResponseDto>[]>(() => [
        {
            id: 'user',
            header: 'User',
            cell: ({ row }) => row.original.userUsername ?? row.original.userEmail ?? row.original.userId,
        },
        {
            id: 'service',
            header: 'Service',
            cell: ({ row }) => row.original.serviceName ?? row.original.serviceId,
        },
        {
            id: 'accountUsername',
            accessorKey: 'username',
            header: 'Account Username',
            cell: ({ row }) => row.original.username ?? '—',
        },
        {
            id: 'status',
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <StatusBadge tone={STATUS_TONES[row.original.status] ?? 'neutral'}>
                    {row.original.status}
                </StatusBadge>
            ),
        },
        {
            id: 'autoRenew',
            accessorKey: 'autoRenew',
            header: 'Auto-Renew',
            cell: ({ row }) => {
                const subscription = row.original
                return (
                    <input
                        type="checkbox"
                        checked={subscription.autoRenew}
                        disabled={pendingId === subscription.id}
                        onChange={(e) => onSetAutoRenew(subscription.id, e.target.checked)}
                        className="size-4"
                    />
                )
            },
        },
        {
            id: 'expiresAt',
            accessorKey: 'expiresAt',
            header: 'Expires',
            cell: ({ row }) => formatDate(row.original.expiresAt),
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
            cell: ({ row }) => {
                const subscription = row.original
                const isPending = pendingId === subscription.id
                return (
                    <div className="flex items-center gap-1">
                        {subscription.status === 'disabled' ? (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Enable"
                                disabled={isPending}
                                onClick={() => onSetEnabled(subscription.id, true)}
                            >
                                <CircleCheckIcon className="size-4 text-green-600" />
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Disable"
                                disabled={isPending}
                                onClick={() => setPendingAction({ type: 'disable', subscription })}
                            >
                                <OctagonXIcon className="size-4 text-amber-600" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Renew"
                            disabled={isPending}
                            onClick={() => onRenew(subscription.id)}
                        >
                            <RefreshCw className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Cancel"
                            disabled={isPending}
                            onClick={() => setPendingAction({ type: 'cancel', subscription })}
                        >
                            <Trash2 className="size-4 text-destructive" />
                        </Button>
                    </div>
                )
            },
        },
    ], [pendingId, onSetEnabled, onSetAutoRenew, onRenew])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: filteredSubscriptions,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const closeConfirm = () => setPendingAction(null)

    const runPendingAction = async () => {
        if (!pendingAction) return
        const { type, subscription } = pendingAction
        if (type === 'disable') await onSetEnabled(subscription.id, false)
        if (type === 'cancel') await onCancel(subscription.id)
    }

    if (isLoading) {
        return <p className="py-8 text-center text-muted-foreground">Loading subscriptions…</p>
    }

    if (subscriptions.length === 0) {
        return <p className="py-8 text-center text-muted-foreground">No subscriptions found.</p>
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="h-9 rounded-md border border-default bg-dropdown px-3 text-sm text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <option value="">All users</option>
                        {userOptions.map(([id, label]) => (
                            <option key={id} value={id}>{label}</option>
                        ))}
                    </select>
                    <select
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="h-9 rounded-md border border-default bg-dropdown px-3 text-sm text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <option value="">All services</option>
                        {serviceOptions.map(([id, label]) => (
                            <option key={id} value={id}>{label}</option>
                        ))}
                    </select>
                </div>
                <DataTableColumnToggle table={table} />
            </div>

            {filteredSubscriptions.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No subscriptions match the selected filters.</p>
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

            <ConfirmDialog
                open={pendingAction !== null}
                setOpen={(open) => !open && closeConfirm()}
                title={pendingAction?.type === 'cancel' ? 'Cancel subscription?' : 'Disable subscription?'}
                description={
                    pendingAction?.type === 'cancel'
                        ? 'This will immediately cancel the subscription and remove the external account. This cannot be undone.'
                        : 'The user will lose access to this service until re-enabled.'
                }
                confirmLabel={pendingAction?.type === 'cancel' ? 'Cancel Subscription' : 'Disable'}
                variant="destructive"
                onConfirm={runPendingAction}
            />
        </div>
    )
}
