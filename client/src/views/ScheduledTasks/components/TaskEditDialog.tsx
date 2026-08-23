'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from '@/components/ui/icons'
import type { TaskConfigResponseDto, UpdateTaskConfigDto } from '@/services/task.service'

interface TaskEditDialogProps {
    task: TaskConfigResponseDto | null
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    isSaving: boolean
    onSave: (name: string, patch: UpdateTaskConfigDto) => Promise<void>
}

export function TaskEditDialog({ task, open, setOpen, isSaving, onSave }: TaskEditDialogProps) {
    const [enabled, setEnabled] = useState(false)
    const [runOnStartup, setRunOnStartup] = useState(false)
    const [cronExpression, setCronExpression] = useState('')

    useEffect(() => {
        if (!task) return
        setEnabled(task.enabled)
        setRunOnStartup(task.runOnStartup)
        setCronExpression(task.cronExpression)
    }, [task])

    if (!task) return null

    const handleSave = async () => {
        await onSave(task.name, { enabled, runOnStartup, cronExpression })
        setOpen(false)
    }

    return (
        <ResponsiveModal
            open={open}
            setOpen={setOpen}
            title={`Edit ${task.name}`}
            description="Update the task's schedule and persisted run settings."
        >
            <div className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="task-enabled">Enabled</Label>
                    <div className="flex h-9 items-center">
                        <input id="task-enabled" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-4" />
                    </div>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="task-startup">Run On Startup</Label>
                    <div className="flex h-9 items-center">
                        <input id="task-startup" type="checkbox" checked={runOnStartup} onChange={(event) => setRunOnStartup(event.target.checked)} className="size-4" />
                    </div>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="task-cron">Cron Expression</Label>
                    <Input id="task-cron" value={cronExpression} onChange={(event) => setCronExpression(event.target.value)} />
                </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="size-4 animate-spin" />}
                    Save
                </Button>
            </div>
        </ResponsiveModal>
    )
}
