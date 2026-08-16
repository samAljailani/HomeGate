'use client'

import { useRef, useState } from 'react'
import { type Column, type Table, flexRender } from '@tanstack/react-table'
import { ChevronUp, ChevronDown, ChevronsUpDown, Settings2 } from '@/components/ui/icons'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'
import { Button } from './button'
import { TableHead } from './table'

export function DataTableSortIcon<TData>({ column }: { column: Column<TData> }) {
    const sorted = column.getIsSorted()
    if (sorted === 'asc') return <ChevronUp className="size-3.5" />
    if (sorted === 'desc') return <ChevronDown className="size-3.5" />
    return <ChevronsUpDown className="size-3.5 opacity-50" />
}

export function DataTableColumnToggle<TData>({ table }: { table: Table<TData> }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useOnClickOutside(ref, () => setOpen(false), open)

    return (
        <div ref={ref} className="relative">
            <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
                <Settings2 className="size-4" />
                Columns
            </Button>
            {open && (
                <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-(--border-default) bg-(--bg-dropdown) p-2 shadow-lg">
                    {table.getAllColumns().filter((col) => col.getCanHide()).map((col) => (
                        <label key={col.id} className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-(--bg-dropdown-hover) rounded">
                            <input
                                type="checkbox"
                                checked={col.getIsVisible()}
                                onChange={col.getToggleVisibilityHandler()}
                                className="size-3.5"
                            />
                            {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                        </label>
                    ))}
                </div>
            )}
        </div>
    )
}

export function DataTableSortableHead<TData>({ header }: { header: { column: Column<TData>; id: string; isPlaceholder: boolean; getContext: () => any } }) {
    return (
        <TableHead
            className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
        >
            <span className="flex items-center gap-1">
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getCanSort() && <DataTableSortIcon column={header.column} />}
            </span>
        </TableHead>
    )
}
