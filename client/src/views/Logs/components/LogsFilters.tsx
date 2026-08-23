'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LogListRequestDto } from '@/services/log.service'

const LOG_LEVELS = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'] as const

interface LogsFiltersProps {
    isLoading: boolean
    onApply: (filters: LogListRequestDto) => void
}

export function LogsFilters({ isLoading, onApply }: LogsFiltersProps) {
    const [userId, setUserId] = useState('')
    const [sessionId, setSessionId] = useState('')
    const [logLevel, setLogLevel] = useState('')
    const [createdAfter, setCreatedAfter] = useState('')
    const [createdBefore, setCreatedBefore] = useState('')
    const [search, setSearch] = useState('')

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        onApply({
            userId: userId.trim() || undefined,
            sessionId: sessionId.trim() || undefined,
            logLevel: (logLevel || undefined) as LogListRequestDto['logLevel'],
            createdAfter: createdAfter ? new Date(createdAfter).toISOString() : undefined,
            createdBefore: createdBefore ? new Date(createdBefore).toISOString() : undefined,
            search: search.trim() || undefined,
        })
    }

    const handleClear = () => {
        setUserId('')
        setSessionId('')
        setLogLevel('')
        setCreatedAfter('')
        setCreatedBefore('')
        setSearch('')
        onApply({})
    }

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-1.5">
                <Label htmlFor="log-search">Search</Label>
                <Input
                    id="log-search"
                    placeholder="Search message, context, stack trace"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="log-level">Level</Label>
                <select
                    id="log-level"
                    value={logLevel}
                    onChange={(e) => setLogLevel(e.target.value)}
                    className="h-9 rounded-md border border-default bg-dropdown px-3 text-sm text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <option value="">All levels</option>
                    {LOG_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="log-user">User ID</Label>
                <Input id="log-user" placeholder="uuid" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="log-session">Session ID</Label>
                <Input id="log-session" placeholder="uuid" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="log-after">Created After</Label>
                <Input id="log-after" type="datetime-local" value={createdAfter} onChange={(e) => setCreatedAfter(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="log-before">Created Before</Label>
                <Input id="log-before" type="datetime-local" value={createdBefore} onChange={(e) => setCreatedBefore(e.target.value)} />
            </div>

            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={isLoading}>Apply Filters</Button>
                <Button type="button" variant="outline" disabled={isLoading} onClick={handleClear}>Clear</Button>
            </div>
        </form>
    )
}
