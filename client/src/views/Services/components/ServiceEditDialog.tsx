'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from '@/components/ui/icons'
import type { ServicePatchRequestDto, ServiceResponseDto } from '@/services/service.service'

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

interface ServiceEditDialogProps {
    service: ServiceResponseDto | null
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    isSaving: boolean
    onSave: (slug: string, patch: ServicePatchRequestDto) => Promise<void>
}

export function ServiceEditDialog({ service, open, setOpen, isSaving, onSave }: ServiceEditDialogProps) {
    const [enabled, setEnabled] = useState(false)
    const [url, setUrl] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [slug, setSlug] = useState('')
    const [slugError, setSlugError] = useState<string | null>(null)
    const [urlError, setUrlError] = useState<string | null>(null)

    useEffect(() => {
        if (!service) return
        setEnabled(service.enabled)
        setUrl(service.url ?? '')
        setImageUrl(service.imageUrl ?? '')
        setSlug(service.slug)
        setSlugError(null)
        setUrlError(null)
    }, [service])

    if (!service) return null

    const handleSave = async () => {
        const trimmedSlug = slug.trim()
        if (!trimmedSlug) {
            setSlugError('Slug is required')
            return
        }
        if (!SLUG_PATTERN.test(trimmedSlug)) {
            setSlugError('Lowercase alphanumeric, hyphens only')
            return
        }
        const trimmedUrl = url.trim()
        if (!trimmedUrl) {
            setUrlError('URL is required')
            return
        }
        setSlugError(null)
        setUrlError(null)
        await onSave(service.slug, {
            slug: trimmedSlug,
            enabled,
            url: trimmedUrl,
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
                    <Label htmlFor="service-slug">Slug</Label>
                    <Input
                        id="service-slug"
                        placeholder="my-service"
                        value={slug}
                        aria-invalid={!!slugError}
                        onChange={(e) => setSlug(e.target.value)}
                    />
                    {slugError && <p className="text-sm text-destructive">{slugError}</p>}
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
                        aria-invalid={!!urlError}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                    {urlError && <p className="text-sm text-destructive">{urlError}</p>}
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
