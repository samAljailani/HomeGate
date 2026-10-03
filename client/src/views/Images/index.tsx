'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthContext } from '@/context/auth-context'
import { imageService, type PublicImage } from '@/services/image.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import {
    Copy,
    Plus,
    RefreshCw,
    Trash2,
    Loader2,
    IconLock,
} from '@/components/ui/icons'
import { addToastMessage, copyToClipboard, getErrorMessage } from '@/lib/utils'

export function AdminImages() {
    const { user, isLoading: authLoading } = useAuthContext()
    const [images, setImages] = useState<PublicImage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState<PublicImage | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const picker = useRef<HTMLInputElement>(null)

    const refresh = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            setImages(await imageService.list())
        } catch (error) {
            setError(getErrorMessage(error, 'Failed to load images.'))
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (user?.isAdmin) void refresh()
    }, [user?.isAdmin, refresh])

    const upload = async (file: File) => {
        setBusy(true)
        setError(null)
        try {
            const image = await imageService.upload(file)
            setImages((previous) =>
                [...previous, image].sort((a, b) =>
                    a.name.localeCompare(b.name)
                )
            )
            addToastMessage('success', 'Image uploaded')
        } catch (error) {
            setError(getErrorMessage(error, 'Failed to upload image.'))
        } finally {
            setBusy(false)
            if (picker.current) picker.current.value = ''
        }
    }

    const remove = async () => {
        if (!selected) return
        setBusy(true)
        try {
            await imageService.remove(selected.name)
            setImages((previous) =>
                previous.filter((image) => image.name !== selected.name)
            )
            addToastMessage('success', 'Image deleted')
        } catch (error) {
            setError(getErrorMessage(error, 'Failed to delete image.'))
        } finally {
            setBusy(false)
        }
    }

    const copy = async (url: string) => {
        try {
            await copyToClipboard(url)
            addToastMessage('success', 'Image path copied')
        } catch {
            setError('Could not copy the image path.')
        }
    }

    if (authLoading)
        return <p className="py-8 text-muted-foreground">Loading…</p>
    if (!user?.isAdmin)
        return (
            <p className="py-8 text-muted-foreground">
                Administrator access required.
            </p>
        )
    const visible = images.filter((image) =>
        image.name.toLowerCase().includes(query.toLowerCase())
    )

    return (
        <div className="py-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Images</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage public images for your services. Copy a path to
                        use it as a service image.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        disabled={busy || isLoading}
                        onClick={() => void refresh()}
                    >
                        <RefreshCw className="size-4" />
                        Refresh
                    </Button>
                    <Button
                        disabled={busy}
                        onClick={() => picker.current?.click()}
                    >
                        {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        Add image
                    </Button>
                </div>
            </div>
            <input
                ref={picker}
                type="file"
                accept="image/png,image/svg+xml,.png,.svg"
                className="sr-only"
                aria-label="Upload PNG or SVG image"
                disabled={busy}
                onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void upload(file)
                }}
            />
            <p className="text-sm text-muted-foreground">
                PNG: up to 2 MB and 4 megapixels. SVG: up to 256 KB, static
                shapes only. Existing files are never overwritten.
            </p>
            {error && (
                <p
                    role="alert"
                    className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
                >
                    {error}
                </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search images…"
                    aria-label="Search images"
                    className="max-w-sm"
                />
                <p className="text-sm text-muted-foreground">
                    {images.length} images
                </p>
            </div>
            {isLoading ? (
                <p className="py-8 text-muted-foreground">Loading images…</p>
            ) : visible.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                    {query
                        ? 'No images match your search.'
                        : 'No images yet. Add a PNG or SVG to get started.'}
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visible.map((image) => (
                        <Card key={image.name} className="overflow-hidden">
                            <button
                                type="button"
                                aria-label={`View ${image.name}`}
                                className="flex h-40 w-full items-center justify-center border-b bg-muted/40 p-5 focus-visible:outline-2 focus-visible:outline-ring"
                                onClick={() => {
                                    setSelected(image)
                                    setPreviewOpen(true)
                                }}
                            >
                                <img
                                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${image.url}?v=${encodeURIComponent(image.updatedAt)}`}
                                    alt={image.name}
                                    loading="lazy"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </button>
                            <CardContent className="space-y-3 pt-4">
                                <p
                                    className="truncate font-medium"
                                    title={image.name}
                                >
                                    {image.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {image.name.endsWith('.svg')
                                        ? 'SVG'
                                        : 'PNG'}{' '}
                                    · {(image.size / 1024).toFixed(1)} KB
                                </p>
                                <p className="min-h-8 text-xs text-muted-foreground">
                                    {image.protected
                                        ? 'App logo · protected'
                                        : image.usedBy.length
                                          ? `Used by ${image.usedBy.join(', ')}`
                                          : 'Not used by a service'}
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void copy(image.url)}
                                    >
                                        <Copy className="size-4" />
                                        Copy path
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={
                                            busy ||
                                            image.protected ||
                                            image.usedBy.length > 0
                                        }
                                        aria-label={`Delete ${image.name}`}
                                        title={
                                            image.protected ||
                                            image.usedBy.length
                                                ? 'Image is in use'
                                                : 'Delete image'
                                        }
                                        onClick={() => {
                                            setSelected(image)
                                            setConfirmOpen(true)
                                        }}
                                    >
                                        {image.protected ||
                                        image.usedBy.length ? (
                                            <IconLock className="size-4" />
                                        ) : (
                                            <Trash2 className="size-4 text-destructive" />
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            <ResponsiveModal
                open={previewOpen}
                setOpen={setPreviewOpen}
                title={selected?.name ?? 'Image preview'}
                description={selected?.url}
                className="sm:max-w-[720px]"
            >
                {selected && (
                    <img
                        src={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${selected.url}?v=${encodeURIComponent(selected.updatedAt)}`}
                        alt={selected.name}
                        className="mx-auto max-h-[60vh] max-w-full object-contain"
                    />
                )}
            </ResponsiveModal>
            <ConfirmDialog
                open={confirmOpen}
                setOpen={setConfirmOpen}
                title="Delete image?"
                description={`Permanently delete ${selected?.name ?? 'this image'}? This cannot be undone.`}
                confirmLabel="Delete image"
                variant="destructive"
                onConfirm={remove}
            />
        </div>
    )
}
