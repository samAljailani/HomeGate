'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { addToastMessage, cn, getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { subscriptionService, type SubscriptionAccountDto } from '@/services/subscription.service'
import type { AccountSubscription } from '../hooks/useAccountPage'

interface SubscriptionAccountsPanelProps {
    subscription: AccountSubscription
    onAccountChanged: (id: string, updated: AccountSubscription) => void
}

type AddAccountFormValues = {
    serviceUsername: string
    email: string
    servicePassword: string
    confirmServicePassword: string
}

interface AccountPasswordResetProps {
    subscriptionId: string
    account: SubscriptionAccountDto
}

function AccountPasswordReset({ subscriptionId, account }: AccountPasswordResetProps) {
    const [newPassword, setNewPassword] = React.useState('')
    const [confirmPassword, setConfirmPassword] = React.useState('')
    const [confirmError, setConfirmError] = React.useState<string | null>(null)
    const [isResetting, setIsResetting] = React.useState(false)

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (newPassword !== confirmPassword) {
            setConfirmError('Passwords do not match')
            return
        }

        setIsResetting(true)
        setConfirmError(null)

        try {
            await subscriptionService.resetPassword(
                subscriptionId,
                account.id,
                newPassword,
                confirmPassword
            )
            addToastMessage('success', `Password updated for ${account.username ?? 'the linked account'}`)
            setNewPassword('')
            setConfirmPassword('')
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to reset password')
            )
        } finally {
            setIsResetting(false)
        }
    }

    return (
        <form className="grid gap-2" onSubmit={submit}>
            <div className="grid gap-2">
                <Label htmlFor={`${account.id}-new`}>New password</Label>
                <Input
                    id={`${account.id}-new`}
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor={`${account.id}-confirm`}>Confirm password</Label>
                <Input
                    id={`${account.id}-confirm`}
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
            <div>
                <Button type="submit" variant="secondary" disabled={isResetting}>
                    Update password
                </Button>
            </div>
        </form>
    )
}

export function SubscriptionAccountsPanel({
    subscription,
    onAccountChanged,
}: SubscriptionAccountsPanelProps) {
    const [isSaving, setIsSaving] = React.useState(false)

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<AddAccountFormValues>()

    React.useEffect(() => {
        reset({ serviceUsername: '', email: '', servicePassword: '', confirmServicePassword: '' })
    }, [reset, subscription.id])

    const linkedAccountCount = subscription.accounts?.length ?? 0
    const accountCap = subscription.accountCap ?? 1
    const canAddAccounts = linkedAccountCount < accountCap
    const requiredInputs = subscription.requiredInputs
    const usernameRequired = requiredInputs?.username ?? true
    const emailRequired = requiredInputs?.email ?? false
    const passwordRequired = requiredInputs?.password ?? true

    const addAccount = handleSubmit(async (values) => {
        if (values.servicePassword !== values.confirmServicePassword) {
            setError('confirmServicePassword', { message: 'Passwords do not match' })
            return
        }

        setIsSaving(true)
        try {
            const updated = await subscriptionService.addAccount(subscription.id, {
                serviceUsername: values.serviceUsername,
                servicePassword: values.servicePassword,
                confirmServicePassword: values.confirmServicePassword,
                email: values.email || undefined,
            })
            onAccountChanged(subscription.id, { ...subscription, ...updated })
            addToastMessage('success', 'Account added')
            reset({ serviceUsername: '', email: '', servicePassword: '', confirmServicePassword: '' })
        } catch (error) {
            addToastMessage(
                'error',
                getErrorMessage(error, 'Failed to add account')
            )
        } finally {
            setIsSaving(false)
        }
    })

    return (
        <div className="grid gap-6">
            <div className="grid gap-3">
                {subscription.accounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No linked service accounts yet.
                    </p>
                ) : (
                    subscription.accounts.map((account, index) => (
                        <div
                            key={account.id}
                            className={cn(
                                'grid gap-3 rounded-lg border p-4',
                                index > 0 && 'border-dashed'
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium break-all">
                                    {account.username ?? account.id}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                    #{index + 1}
                                </span>
                            </div>
                            {account.externalAccountId && (
                                <AccountPasswordReset
                                    subscriptionId={subscription.id}
                                    account={account}
                                />
                            )}
                        </div>
                    ))
                )}
            </div>

            {canAddAccounts ? (
                <form className="grid gap-3 border-t pt-4" onSubmit={addAccount}>
                    <div>
                        <p className="text-sm font-medium">Add another account</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            You can link up to {accountCap} accounts.
                        </p>
                    </div>
                    {usernameRequired && (
                        <div className="grid gap-2">
                            <Label htmlFor="serviceUsername">Username</Label>
                            <Input id="serviceUsername" autoComplete="off" {...register('serviceUsername', { required: 'Required' })} />
                            {errors.serviceUsername && <p className="text-sm text-destructive">{errors.serviceUsername.message}</p>}
                        </div>
                    )}
                    {emailRequired && (
                        <div className="grid gap-2">
                            <Label htmlFor="accountEmail">Email</Label>
                            <Input
                                id="accountEmail"
                                type="email"
                                autoComplete="off"
                                {...register('email', { required: 'Email is required', validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Enter a valid email address' })}
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                            <p className="text-xs text-muted-foreground">
                                Must match your HomeGate account email address.
                            </p>
                        </div>
                    )}
                    {passwordRequired && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="servicePassword">Password</Label>
                                <Input id="servicePassword" type="password" autoComplete="new-password" {...register('servicePassword', { required: 'Required' })} />
                                {errors.servicePassword && <p className="text-sm text-destructive">{errors.servicePassword.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="confirmServicePassword">Confirm password</Label>
                                <Input id="confirmServicePassword" type="password" autoComplete="new-password" {...register('confirmServicePassword', { required: 'Required' })} />
                                {errors.confirmServicePassword && <p className="text-sm text-destructive">{errors.confirmServicePassword.message}</p>}
                            </div>
                        </>
                    )}
                    <div>
                        <Button type="submit" disabled={isSaving}>
                            Add account
                        </Button>
                    </div>
                </form>
            ) : (
                <p className="border-t pt-4 text-sm text-muted-foreground">
                    This subscription has reached its account limit
                    ({linkedAccountCount}/{accountCap}).
                </p>
            )}
        </div>
    )
}