'use client'

import type { Dispatch, SetStateAction } from 'react'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import type { LogResponseDto } from '@/services/log.service'

interface LogDetailsDialogProps {
    log: LogResponseDto | null
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
}

export function LogDetailsDialog({ log, open, setOpen }: LogDetailsDialogProps) {
    if (!log) return null

    return (
        <ResponsiveModal
            open={open}
            setOpen={setOpen}
            title={`Log #${log.id}`}
            description={new Date(log.createdAt).toLocaleString()}
        >
            <div className="grid gap-3 text-sm">
                <div>
                    <span className="font-medium text-foreground">Message</span>
                    <p className="whitespace-pre-wrap text-muted-foreground">{log.message}</p>
                </div>
                {log.context && (
                    <div>
                        <span className="font-medium text-foreground">Context</span>
                        <p className="whitespace-pre-wrap text-muted-foreground">{log.context}</p>
                    </div>
                )}
                {log.userId && (
                    <div>
                        <span className="font-medium text-foreground">User</span>
                        <p className="text-muted-foreground">{log.userId}</p>
                    </div>
                )}
                {log.sessionId && (
                    <div>
                        <span className="font-medium text-foreground">Session</span>
                        <p className="text-muted-foreground">{log.sessionId}</p>
                    </div>
                )}
                {log.stackTrace && (
                    <div>
                        <span className="font-medium text-foreground">Stack Trace</span>
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs text-muted-foreground">
                            {log.stackTrace}
                        </pre>
                    </div>
                )}
            </div>
        </ResponsiveModal>
    )
}
