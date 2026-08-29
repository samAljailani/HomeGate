'use client'

import * as React from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { cn, addToastMessage } from '@/lib/utils'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { serviceService, type ServicePutRequestDto, type ServiceResponseDto } from '@/services/service.service'

interface ServiceCreateDialogProps {
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    services: ServiceResponseDto[]
    onCreated: () => void
}

export function ServiceCreateDialog({ open, setOpen, services, onCreated }: ServiceCreateDialogProps) {
    return (
        <ResponsiveModal open={open} setOpen={setOpen} title="New Service" description="Add a REFERENCED or NONE service.">
            <ServiceCreateForm services={services} setOpen={setOpen} onCreated={onCreated} />
        </ResponsiveModal>
    )
}

function ServiceCreateForm({
    services,
    setOpen,
    onCreated,
}: {
    services: ServiceResponseDto[]
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    onCreated: () => void
}) {
    const {
        register,
        handleSubmit,
        watch,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<ServicePutRequestDto>({
        defaultValues: { accountType: 'NONE', enabled: true, defaultAllowed: true },
    })

    const accountType = watch('accountType')
    const managedSources = services.filter((s) => s.accountType === 'MANAGED')

    const onSubmit: SubmitHandler<ServicePutRequestDto> = async (data) => {
        try {
            await serviceService.createService(data)
            addToastMessage('success', `Service '${data.name}' created`)
            onCreated()
            setOpen(false)
        } catch {
            setError('root', { message: 'Failed to create service' })
        }
    }

    return (
        <form className={cn('grid items-start gap-5')} onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                    id="slug"
                    placeholder="my-service"
                    {...register('slug', {
                        required: 'Slug is required',
                        pattern: { value: /^[a-z0-9]+(-[a-z0-9]+)*$/, message: 'Lowercase alphanumeric, hyphens only' },
                    })}
                />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="My Service" {...register('name', { required: 'Name is required' })} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="accountType">Account Type</Label>
                <select
                    id="accountType"
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    {...register('accountType')}
                >
                    <option value="NONE">NONE</option>
                    <option value="REFERENCED">REFERENCED</option>
                </select>
            </div>

            {accountType === 'REFERENCED' && (
                <div className="grid gap-2">
                    <Label htmlFor="accountSourceServiceId">Account Source</Label>
                    <select
                        id="accountSourceServiceId"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        {...register('accountSourceServiceId', {
                            required: 'Account source is required for REFERENCED services',
                            valueAsNumber: true,
                        })}
                    >
                        <option value="">Select a managed service…</option>
                        {managedSources.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    {errors.accountSourceServiceId && (
                        <p className="text-sm text-destructive">{errors.accountSourceServiceId.message}</p>
                    )}
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor="url">URL</Label>
                <Input id="url" placeholder="https://service.example.com" {...register('url')} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input id="imageUrl" placeholder="https://example.com/logo.png" {...register('imageUrl')} />
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" defaultChecked {...register('enabled')} />
                    Enabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" defaultChecked {...register('defaultAllowed')} />
                    Default allowed
                </label>
            </div>

            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

            <Button type="submit" disabled={isSubmitting}>
                Create
            </Button>
        </form>
    )
}
