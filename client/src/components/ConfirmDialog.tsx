'use client'

import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Loader2 } from '@/components/ui/icons'

interface ConfirmDialogProps {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    title: ReactNode
    description?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'destructive'
    onConfirm: () => void | Promise<void>
    children?: ReactNode
}

export function ConfirmDialog({
    open,
    setOpen,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    children,
}: ConfirmDialogProps) {
    const [isConfirming, setIsConfirming] = useState(false)

    const handleConfirm = async () => {
        setIsConfirming(true)
        try {
            await onConfirm()
            setOpen(false)
        } finally {
            setIsConfirming(false)
        }
    }

    return (
        <ResponsiveModal open={open} setOpen={setOpen} title={title} description={description}>
            {children}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isConfirming}>
                    {cancelLabel}
                </Button>
                <Button variant={variant} onClick={handleConfirm} disabled={isConfirming}>
                    {isConfirming && <Loader2 className="size-4 animate-spin" />}
                    {confirmLabel}
                </Button>
            </div>
        </ResponsiveModal>
    )
}
