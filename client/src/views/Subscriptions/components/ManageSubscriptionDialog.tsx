'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { addToastMessage, cn } from '@/lib/utils'
import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { subscriptionService } from '@/services/subscription.service'
import type { AccountSubscription } from '../hooks/useAccountPage'

interface ManageSubscriptionDialogProps {
    subscription: AccountSubscription | null
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    onAutoRenewChanged: (id: string, autoRenew: boolean) => void
    onCancelled: (id: string) => void
}

type PasswordFormValues = {
    newPassword: string
    confirmPassword: string
}

export function ManageSubscriptionDialog({
    subscription,
    open,
    setOpen,
    onAutoRenewChanged,
    onCancelled,
}: ManageSubscriptionDialogProps) {
    const [isSaving, setIsSaving] = React.useState(false)

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<PasswordFormValues>()

    React.useEffect(() => {
        if (open) reset({ newPassword: '', confirmPassword: '' })
    }, [open, reset])

    if (!subscription) return null

    const toggleAutoRenew = async () => {
        setIsSaving(true)
        try {
            const updated = await subscriptionService.setAutoRenew(subscription.id, !subscription.autoRenew)
            onAutoRenewChanged(subscription.id, updated.autoRenew)
            addToastMessage('success', `Auto-renew ${updated.autoRenew ? 'enabled' : 'disabled'}`)
        } catch {
            addToastMessage('error', 'Failed to update auto-renew')
        } finally {
            setIsSaving(false)
        }
    }

    const cancel = async () => {
        setIsSaving(true)
        try {
            await subscriptionService.cancelSubscription(subscription.id, { immediate: true })
            onCancelled(subscription.id)
            addToastMessage('success', 'Subscription cancelled')
            setOpen(false)
        } catch {
            addToastMessage('error', 'Failed to cancel subscription')
        } finally {
            setIsSaving(false)
        }
    }

    const resetPassword = handleSubmit(async (values) => {
        if (values.newPassword !== values.confirmPassword) {
            setError('confirmPassword', { message: 'Passwords do not match' })
            return
        }
        setIsSaving(true)
        try {
            await subscriptionService.resetPassword(subscription.id, values.newPassword, values.confirmPassword)
            addToastMessage('success', 'Password updated')
            reset({ newPassword: '', confirmPassword: '' })
        } catch {
            addToastMessage('error', 'Failed to reset password')
        } finally {
            setIsSaving(false)
        }
    })

    return (
        <ResponsiveModal
            open={open}
            setOpen={setOpen}
            title={`Manage ${subscription.serviceName}`}
            description="Manage your subscription and service account."
        >
            <div className={cn('grid gap-6')}>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Status</p>
                        <StatusBadge tone={subscription.status === 'active' ? 'success' : 'neutral'}>
                            {subscription.status}
                        </StatusBadge>
                    </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={subscription.autoRenew}
                        disabled={isSaving}
                        onChange={toggleAutoRenew}
                    />
                    <span className="text-sm">Auto-renew subscription</span>
                </label>

                {subscription.accountType === 'MANAGED' && (
                    <form className="grid gap-3" onSubmit={resetPassword}>
                        <p className="text-sm font-medium">Reset service password</p>
                        <div className="grid gap-2">
                            <Label htmlFor="newPassword">New password</Label>
                            <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword', { required: 'Required' })} />
                            {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirm password</Label>
                            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword', { required: 'Required' })} />
                            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                        </div>
                        <Button type="submit" disabled={isSaving}>
                            Update password
                        </Button>
                    </form>
                )}

                <div className="border-t pt-4">
                    <Button variant="destructive" disabled={isSaving} onClick={cancel}>
                        Cancel subscription
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    )
}
