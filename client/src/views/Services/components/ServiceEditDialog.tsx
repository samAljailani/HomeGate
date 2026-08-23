'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from '@/components/ui/icons'
import type { ServicePatchRequestDto, ServiceResponseDto } from '@/services/service.service'

interface ServiceEditDialogProps {
    service: ServiceResponseDto | null
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    isSaving: boolean
    onSave: (name: string, patch: ServicePatchRequestDto) => Promise<void>
}

export function ServiceEditDialog({ service, open, setOpen, isSaving, onSave }: ServiceEditDialogProps) {
    const [enabled, setEnabled] = useState(false)
    const [url, setUrl] = useState('')
    const [imageUrl, setImageUrl] = useState('')

    useEffect(() => {
        if (!service) return
        setEnabled(service.enabled)
        setUrl(service.url ?? '')
        setImageUrl(service.imageUrl ?? '')
    }, [service])

    if (!service) return null

    const handleSave = async () => {
        await onSave(service.name, {
            enabled,
            url: url.trim() === '' ? null : url.trim(),
            imageUrl: imageUrl.trim() === '' ? null : imageUrl.trim(),
        })
        setOpen(false)
    }

    return (
        <ResponsiveModal
            open={open}
            setOpen={setOpen}
            title={`Edit ${service.name}`}
            description="Update this service's availability and details."
        >
            <div className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="service-name">Name</Label>
                    <Input id="service-name" value={service.name} disabled readOnly />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="service-enabled">Enabled</Label>
                    <div className="flex items-center h-9">
                        <input
                            id="service-enabled"
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="size-4"
                        />
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="service-url">URL</Label>
                    <Input
                        id="service-url"
                        placeholder="https://service.example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="service-image-url">Image URL</Label>
                    <Input
                        id="service-image-url"
                        placeholder="https://service.example.com/logo.png"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                    />
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
