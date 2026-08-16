'use client'

import { Trash2 } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { InviteAccountDto } from '@/services/invite.service'

interface LinkedAccountRowProps {
    account: InviteAccountDto
    serviceOptions: string[]
    error?: string
    onChange: (field: keyof InviteAccountDto, value: string) => void
    onRemove: () => void
}

export function LinkedAccountRow({ account, serviceOptions, error, onChange, onRemove }: LinkedAccountRowProps) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2">
            <select
                value={account.serviceName}
                onChange={(e) => onChange('serviceName', e.target.value)}
                className="h-9 rounded-md border border-(--border-default) bg-(--bg-dropdown) px-3 text-sm text-(--text-primary) shadow-xs outline-none focus-visible:border-(--border-focus) focus-visible:ring-[3px] focus-visible:ring-(--border-focus)/50"
            >
                <option value="">Select service</option>
                {serviceOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>
            <Input
                placeholder="Username"
                value={account.username ?? ''}
                onChange={(e) => onChange('username', e.target.value)}
                className="max-w-36"
            />
            <Input
                placeholder="Email"
                value={account.email ?? ''}
                onChange={(e) => onChange('email', e.target.value)}
                className="max-w-44"
            />
            <Input
                placeholder="Account ID"
                value={account.accountId ?? ''}
                onChange={(e) => onChange('accountId', e.target.value)}
                className="max-w-36"
            />
            <Button variant="ghost" size="icon-sm" onClick={onRemove} title="Remove account">
                <Trash2 className="size-4" />
            </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    )
}
