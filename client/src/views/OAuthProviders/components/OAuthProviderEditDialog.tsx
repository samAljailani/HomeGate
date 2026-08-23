'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from '@/components/ui/icons'
import type { OAuthProviderResponseDto } from '@/services/oauthProvider.service'

interface OAuthProviderEditDialogProps {
    provider: OAuthProviderResponseDto | null
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    isSaving: boolean
    onSave: (id: number, enabled: boolean) => Promise<void>
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function OAuthProviderEditDialog({ provider, open, setOpen, isSaving, onSave }: OAuthProviderEditDialogProps) {
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        if (!provider) return
        setEnabled(provider.enabled)
    }, [provider])

    if (!provider) return null

    const handleSave = async () => {
        await onSave(provider.id, enabled)
        setOpen(false)
    }

    return (
        <ResponsiveModal
            open={open}
            setOpen={setOpen}
            title={`Edit ${capitalize(provider.name)}`}
            description="Update this sign-in provider's availability."
        >
            <div className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="provider-enabled">Enabled</Label>
                    <div className="flex items-center h-9">
                        <input
                            id="provider-enabled"
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="size-4"
                        />
                    </div>
                    {provider.enabled && !enabled && (
                        <p className="text-sm text-destructive">
                            Disabling will sign out and delete all sessions authenticated through this provider.
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="size-4 animate-spin" />}
                    Save
                </Button>
            </div>
        </ResponsiveModal>
    )
}
