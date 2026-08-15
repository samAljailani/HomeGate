'use client'

import { ClipboardCopy, Check, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LinkedAccountRow } from './LinkedAccountRow'
import type { InviteAccountDto } from '@/services/invite.service'
import type { InviteFieldErrors } from '../hooks/useInviteGenerator'

const EXPIRY_OPTIONS = [1, 3, 7, 30] as const

interface InviteGeneratorProps {
    email: string
    onEmailChange: (value: string) => void
    expiresInDays: number
    onExpiresInDaysChange: (value: number) => void
    isAdmin: boolean
    onIsAdminChange: (value: boolean) => void
    accounts: InviteAccountDto[]
    serviceOptions: string[]
    onAddAccount: () => void
    onRemoveAccount: (index: number) => void
    onUpdateAccount: (index: number, field: keyof InviteAccountDto, value: string) => void
    generatedLink: string
    isGenerating: boolean
    error: string | null
    fieldErrors: InviteFieldErrors
    copied: boolean
    onGenerate: () => void
    onCopyLink: () => void
}

export function InviteGenerator({
    email,
    onEmailChange,
    expiresInDays,
    onExpiresInDaysChange,
    isAdmin,
    onIsAdminChange,
    accounts,
    serviceOptions,
    onAddAccount,
    onRemoveAccount,
    onUpdateAccount,
    generatedLink,
    isGenerating,
    error,
    fieldErrors,
    copied,
    onGenerate,
    onCopyLink,
}: InviteGeneratorProps) {
    return (
        <div className="space-y-4">
            {/* Generated link display + Generate button */}
            <div className="flex items-end gap-3">
                <div className="flex flex-1 items-center gap-0">
                    <Input
                        readOnly
                        value={generatedLink}
                        placeholder="Generated invite link will appear here"
                        className="flex-1 rounded-r-none bg-muted/30"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-l-none border-l-0 shrink-0"
                        onClick={onCopyLink}
                        disabled={!generatedLink}
                        title="Copy to clipboard"
                    >
                        {copied ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />}
                    </Button>
                </div>
                <Button onClick={onGenerate} disabled={isGenerating}>
                    {isGenerating && <Loader2 className="size-4 animate-spin" />}
                    Generate
                </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Invite metadata */}
            <div className="flex flex-wrap items-end gap-4">
                <div className="grid gap-1.5 min-w-50">
                    <Label htmlFor="invite-email">Attach email (optional)</Label>
                    <Input
                        id="invite-email"
                        type="email"
                        placeholder="user@example.com"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                    />
                    {fieldErrors.email && (
                        <p className="text-sm text-destructive">{fieldErrors.email}</p>
                    )}
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="invite-expiry">Expiration (days)</Label>
                    <select
                        id="invite-expiry"
                        value={expiresInDays}
                        onChange={(e) => onExpiresInDaysChange(Number(e.target.value))}
                        className="h-9 rounded-md border border-(--border-default) bg-(--bg-dropdown) px-3 text-sm text-(--text-primary) shadow-xs outline-none focus-visible:border-(--border-focus) focus-visible:ring-[3px] focus-visible:ring-(--border-focus)/50"
                    >
                        {EXPIRY_OPTIONS.map((days) => (
                            <option key={days} value={days}>
                                {days} {days === 1 ? 'day' : 'days'}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="invite-admin">Admin</Label>
                    <div className="flex items-center h-9">
                        <input
                            id="invite-admin"
                            type="checkbox"
                            checked={isAdmin}
                            onChange={(e) => onIsAdminChange(e.target.checked)}
                            className="size-4"
                        />
                    </div>
                </div>
            </div>

            {/* Link accounts section */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label>Link accounts</Label>
                    <Button variant="outline" size="icon-sm" onClick={onAddAccount} title="Add account">
                        <Plus className="size-4" />
                    </Button>
                </div>
                {accounts.map((account, index) => (
                    <LinkedAccountRow
                        key={index}
                        account={account}
                        serviceOptions={serviceOptions}
                        error={fieldErrors.accounts?.[index]}
                        onChange={(field, value) => onUpdateAccount(index, field, value)}
                        onRemove={() => onRemoveAccount(index)}
                    />
                ))}
            </div>
        </div>
    )
}
