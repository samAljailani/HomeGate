'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addToastMessage, getErrorMessage } from '@/lib/utils'
import { sessionService } from '@/services/session.service'

export function SessionConfigCard() {
    const [maxPerUser, setMaxPerUser] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        sessionService
            .getConfig()
            .then((config) => setMaxPerUser(String(config.maxPerUser)))
            .catch((error) =>
                addToastMessage(
                    'error',
                    getErrorMessage(error, 'Failed to load session settings')
                )
            )
            .finally(() => setIsLoading(false))
    }, [])

    const save = async () => {
        const value = Number(maxPerUser)
        if (!Number.isInteger(value) || value < 1 || value > 100) {
            addToastMessage('error', 'Limit must be a whole number between 1 and 100')
            return
        }

        setIsSaving(true)
        try {
            const updated = await sessionService.updateConfig(value)
            setMaxPerUser(String(updated.maxPerUser))
            addToastMessage('success', 'Session settings saved')
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to save session settings')
            )
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) return null

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div>
                <h2 className="text-sm font-medium">Session limit</h2>
                <p className="text-sm text-muted-foreground">
                    Maximum concurrent sessions per user. When a user signs in beyond the limit, their oldest session is revoked.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Input
                    type="number"
                    min={1}
                    max={100}
                    value={maxPerUser}
                    onChange={(e) => setMaxPerUser(e.target.value)}
                    className="w-28"
                />
                <Button onClick={save} disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </div>
    )
}
