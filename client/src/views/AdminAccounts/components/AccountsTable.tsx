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
import { Trash2, Unlink } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/context/preferences-context'
import { preferences } from '@/constants/preferences'
import { DataTableColumnToggle, DataTableSortableHead } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { AccountRow } from '../hooks/useAccountsPage'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface AccountsTableProps {
    rows: AccountRow[]
    isLoading: boolean
    error: string | null
    onDelete: (subscriptionId: string, accountId: string, deprovisionExternal?: boolean) => Promise<boolean>
}

type PendingAction = {
    row: AccountRow
    mode: 'deprovision' | 'unlink'
}

export function AccountsTable({ rows, isLoading, error, onDelete }: AccountsTableProps) {
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [userFilter, setUserFilter] = useState('')
    const [serviceFilter, setServiceFilter] = useState('')
    const columnVisibility = getColumnVisibility(preferences.columns.adminAccounts)

    const userOptions = useMemo(() => {
        const seen = new Map<string, string>()
        rows.forEach((r) => seen.set(r.subscription.userId, r.userLabel))
        return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
    }, [rows])

    const serviceOptions = useMemo(() => {
        const seen = new Map<number, string>()
        rows.forEach((r) => seen.set(r.subscription.serviceId, r.serviceName))
        return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
    }, [rows])

    const filteredRows = useMemo(() => {
        return rows.filter((r) => {
            if (userFilter && r.subscription.userId !== userFilter) return false
            if (serviceFilter && String(r.subscription.serviceId) !== serviceFilter) return false
            return true
        })
    }, [rows, userFilter, serviceFilter])

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminAccounts, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<AccountRow>[]>(() => [
        {
            id: 'user',
            header: 'User',
            cell: ({ row }) => row.original.userLabel,
        },
        {
            id: 'service',
            header: 'Service',
            cell: ({ row }) => row.original.serviceName,
        },
        {
            id: 'username',
            header: 'Username',
            cell: ({ row }) => row.original.account.username ?? '—',
        },
        {
            id: 'email',
            header: 'Email',
            cell: ({ row }) => row.original.account.email ?? '—',
        },
        {
            id: 'linked',
            header: 'Linked Accounts',
            cell: ({ row }) => `${row.original.accountCount} / ${row.original.accountCap}`,
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => {
                const canDelete = row.original.canDelete
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            title={
                                canDelete
                                    ? 'Unlink reference only (keep external account)'
                                    : 'A subscription must keep at least one account'
                            }
                            disabled={!canDelete}
                            onClick={() => setPendingAction({ row: row.original, mode: 'unlink' })}
                        >
                            <Unlink className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            title={
                                canDelete
                                    ? 'Delete account and external account'
                                    : 'A subscription must keep at least one account'
                            }
                            disabled={!canDelete}
                            onClick={() => setPendingAction({ row: row.original, mode: 'deprovision' })}
                        >
                            <Trash2 className="size-4 text-destructive" />
                        </Button>
                    </div>
                )
            },
        },
    ], [])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: filteredRows,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const confirmDelete = async () => {
        if (!pendingAction) return
        setIsDeleting(true)
        const ok = await onDelete(
            pendingAction.row.subscription.id,
            pendingAction.row.account.id,
            pendingAction.mode === 'deprovision'
        )
        setIsDeleting(false)
        if (ok) setPendingAction(null)
    }

    if (isLoading) {
        return <p className="py-8 text-center text-muted-foreground">Loading linked accounts…</p>
    }

    if (rows.length === 0) {
        return <p className="py-8 text-center text-muted-foreground">No linked accounts found.</p>
    }

    return (
        <div className="space-y-2">
            {error && <p className="text-sm text-error">{error}</p>}

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

            {filteredRows.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No linked accounts match the selected filters.</p>
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
                setOpen={(open) => !open && !isDeleting && setPendingAction(null)}
                title={
                    pendingAction?.mode === 'deprovision'
                        ? 'Delete account and external account?'
                        : 'Unlink account?'
                }
                description={
                    pendingAction
                        ? pendingAction.mode === 'deprovision'
                            ? `This will delete the '${pendingAction.row.account.username ?? 'unnamed'}' account on ${pendingAction.row.serviceName} for ${pendingAction.row.userLabel} and remove its reference in HomeGate. This cannot be undone.`
                            : `This will remove the '${pendingAction.row.account.username ?? 'unnamed'}' reference from HomeGate for ${pendingAction.row.userLabel}. The external account on ${pendingAction.row.serviceName} is kept.`
                        : ''
                }
                confirmLabel={
                    pendingAction?.mode === 'deprovision' ? 'Delete Account' : 'Unlink'
                }
                variant="destructive"
                onConfirm={confirmDelete}
            />
        </div>
    )
}