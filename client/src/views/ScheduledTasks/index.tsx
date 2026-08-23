'use client'

import { useScheduledTasksPage } from './hooks/useScheduledTasksPage'
import { useScheduledTasksTable } from './hooks/useScheduledTasksTable'
import { ScheduledTasksTable } from './components/ScheduledTasksTable'

export function AdminScheduledTasks() {
    const { tasks, isLoading, replaceTask } = useScheduledTasksPage()
    const tasksTable = useScheduledTasksTable({ replaceTask })

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Scheduled Tasks</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage scheduled task configuration and inspect recent execution status.</p>
            </div>
            <ScheduledTasksTable
                tasks={tasks}
                isLoading={isLoading}
                pendingName={tasksTable.pendingName}
                onUpdate={tasksTable.updateTask}
                onStart={tasksTable.startTask}
                onStop={tasksTable.stopTask}
                onRun={tasksTable.runTask}
            />
        </div>
    )
}
