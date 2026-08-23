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
import { Pencil, Play, Square, Zap } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/context/preferences-context'
import { preferences } from '@/constants/preferences'
import { DataTableColumnToggle, DataTableSortableHead } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import type { TaskConfigResponseDto, UpdateTaskConfigDto } from '@/services/task.service'
import { TaskEditDialog } from './TaskEditDialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface ScheduledTasksTableProps {
    tasks: TaskConfigResponseDto[]
    isLoading: boolean
    pendingName: string | null
    onUpdate: (name: string, patch: UpdateTaskConfigDto) => Promise<void>
    onStart: (name: string) => Promise<void>
    onStop: (name: string) => Promise<void>
    onRun: (name: string) => Promise<void>
}

function formatDate(value?: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

function formatDuration(value?: number | null): string {
    if (value == null) return '—'
    if (value < 1000) return `${value} ms`
    return `${(value / 1000).toFixed(2)} s`
}

export function ScheduledTasksTable({ tasks, isLoading, pendingName, onUpdate, onStart, onStop, onRun }: ScheduledTasksTableProps) {
    const { getColumnVisibility, setColumnVisibility } = usePreferences()
    const [sorting, setSorting] = useState<SortingState>([])
    const [editingTask, setEditingTask] = useState<TaskConfigResponseDto | null>(null)
    const columnVisibility = getColumnVisibility(preferences.columns.adminScheduledTasks)

    const onColumnVisibilityChange = useCallback(
        (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            setColumnVisibility(preferences.columns.adminScheduledTasks, next)
        },
        [columnVisibility, setColumnVisibility]
    )

    const columns = useMemo<ColumnDef<TaskConfigResponseDto>[]>(() => [
        { id: 'name', accessorKey: 'name', header: 'Name' },
        { id: 'cronExpression', accessorKey: 'cronExpression', header: 'Schedule' },
        {
            id: 'enabled',
            accessorKey: 'enabled',
            header: 'Enabled',
            cell: ({ row }) => <StatusBadge tone={row.original.enabled ? 'success' : 'neutral'}>{row.original.enabled ? 'Enabled' : 'Disabled'}</StatusBadge>,
        },
        {
            id: 'isActive',
            accessorKey: 'isActive',
            header: 'Live Status',
            cell: ({ row }) => <StatusBadge tone={row.original.isActive ? 'success' : 'neutral'}>{row.original.isActive ? 'Running' : 'Stopped'}</StatusBadge>,
        },
        {
            id: 'lastAttemptedRunAt',
            accessorFn: (row) => (row.lastAttemptedRunAt ? new Date(row.lastAttemptedRunAt).getTime() : undefined),
            sortUndefined: 'last',
            header: 'Last Attempted Run',
            cell: ({ row }) => formatDate(row.original.lastAttemptedRunAt),
        },
        {
            id: 'lastSuccessfulRunAt',
            accessorFn: (row) => (row.lastSuccessfulRunAt ? new Date(row.lastSuccessfulRunAt).getTime() : undefined),
            sortUndefined: 'last',
            header: 'Last Successful Run',
            cell: ({ row }) => formatDate(row.original.lastSuccessfulRunAt),
        },
        {
            id: 'lastRunDurationMs',
            accessorFn: (row) => row.lastRunDurationMs ?? undefined,
            sortUndefined: 'last',
            header: 'Duration',
            cell: ({ row }) => formatDuration(row.original.lastRunDurationMs),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => {
                const task = row.original
                const isPending = pendingName === task.name
                return (
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" title="Edit" disabled={isPending} onClick={() => setEditingTask(task)}>
                            <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Run now" disabled={isPending} onClick={() => onRun(task.name)}>
                            <Zap className="size-4 text-blue-600" />
                        </Button>
                        {task.isActive ? (
                            <Button variant="ghost" size="icon-sm" title="Stop" disabled={isPending} onClick={() => onStop(task.name)}>
                                <Square className="size-4 text-amber-600" />
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon-sm" title="Start" disabled={isPending || !task.enabled} onClick={() => onStart(task.name)}>
                                <Play className="size-4 text-green-600" />
                            </Button>
                        )}
                    </div>
                )
            },
        },
    ], [onRun, onStart, onStop, pendingName])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: tasks,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    if (isLoading) return <p className="py-8 text-center text-muted-foreground">Loading scheduled tasks…</p>
    if (tasks.length === 0) return <p className="py-8 text-center text-muted-foreground">No scheduled tasks found.</p>

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
            <TaskEditDialog
                task={editingTask}
                open={editingTask !== null}
                setOpen={(open) => !open && setEditingTask(null)}
                isSaving={pendingName === editingTask?.name}
                onSave={onUpdate}
            />
        </div>
    )
}
