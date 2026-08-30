'use client'

import { useCallback, useState } from 'react'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { UserResponseForAdminDto } from '@/services/user.service'
import { useUserServiceAccess, type PolicyChoice } from '../hooks/useUserServiceAccess'

interface UserServiceAccessProps {
    users: UserResponseForAdminDto[]
}

const SELECT_CLASS =
    'h-9 rounded-md border border-default bg-dropdown px-3 text-sm text-primary shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

function AccessBadge({ effect }: { effect: PolicyChoice }) {
    if (effect === null) {
        return <span className="text-sm text-muted-foreground">Default</span>
    }
    return (
        <StatusBadge tone={effect === 'ALLOW' ? 'success' : 'error'}>
            {effect}
        </StatusBadge>
    )
}

function effectiveAccess(
    defaultAllowed: boolean,
    policy: PolicyChoice
): 'ALLOW' | 'DENY' {
    if (policy !== null) return policy
    return defaultAllowed ? 'ALLOW' : 'DENY'
}

interface PendingChoice {
    serviceId: number
    value: 'DEFAULT' | 'ALLOW' | 'DENY'
}

export function UserServiceAccess({ users }: UserServiceAccessProps) {
    const {
        selectedUserId,
        setSelectedUserId,
        services,
        isLoading,
        pendingServiceId,
        policyFor,
        applyPolicy,
    } = useUserServiceAccess(users)
    const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null)

    const selectedUser = users.find((u) => u.id === selectedUserId) ?? null
    const pendingService = pendingChoice ? services.find((s) => s.id === pendingChoice.serviceId) : null

    const onChangePolicy = useCallback((serviceId: number, value: string) => {
        if (value !== 'DEFAULT' && value !== 'ALLOW' && value !== 'DENY') return
        setPendingChoice({ serviceId, value })
    }, [])

    const confirmChoice = useCallback(async () => {
        if (!pendingChoice) return
        const effect = pendingChoice.value === 'DEFAULT' ? null : pendingChoice.value
        await applyPolicy(pendingChoice.serviceId, effect)
        setPendingChoice(null)
    }, [pendingChoice, applyPolicy])

    const pendingEffect = pendingChoice?.value === 'DEFAULT' ? null : pendingChoice?.value ?? null

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">User</span>
                    <select
                        value={selectedUserId ?? ''}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className={SELECT_CLASS}
                    >
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.username} {u.email ? `(${u.email})` : ''}
                            </option>
                        ))}
                    </select>
                </label>
                <p className="text-sm text-muted-foreground">
                    Explicit policies override each service&apos;s default. Admins
                    see all services; non-admins only the allowed subset.
                </p>
            </div>

            {isLoading ? (
                <p className="py-8 text-center text-muted-foreground">
                    Loading access policies…
                </p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableCell className="font-medium">Service</TableCell>
                            <TableCell className="font-medium">Default</TableCell>
                            <TableCell className="font-medium">Policy</TableCell>
                            <TableCell className="font-medium">Effective Access</TableCell>
                            <TableCell className="font-medium">Override</TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {services.map((service) => {
                            const policy = policyFor(service.id)
                            const effective = effectiveAccess(service.defaultAllowed, policy)
                            const displayValue =
                                pendingChoice?.serviceId === service.id
                                    ? pendingChoice.value
                                    : (policy ?? 'DEFAULT')
                            return (
                                <TableRow key={service.id}>
                                    <TableCell>{service.name}</TableCell>
                                    <TableCell>
                                        <AccessBadge effect={service.defaultAllowed ? 'ALLOW' : 'DENY'} />
                                    </TableCell>
                                    <TableCell>
                                        <AccessBadge effect={policy} />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge tone={effective === 'ALLOW' ? 'success' : 'error'}>
                                            {effective}
                                        </StatusBadge>
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            className={SELECT_CLASS}
                                            disabled={pendingServiceId === service.id}
                                            value={displayValue}
                                            onChange={(e) => onChangePolicy(service.id, e.target.value)}
                                        >
                                            <option value="DEFAULT">Default</option>
                                            <option value="ALLOW">Allow</option>
                                            <option value="DENY">Deny</option>
                                        </select>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            )}

            <ConfirmDialog
                open={pendingChoice !== null}
                setOpen={(open) => !open && setPendingChoice(null)}
                title={`${pendingChoice?.value ?? ''} access to ${pendingService?.name ?? 'this service'}?`}
                description={
                    pendingEffect === 'DENY'
                        ? `${selectedUser?.username ?? 'This user'}'s subscription to ${pendingService?.name ?? 'this service'} will be cancelled if one exists.`
                        : pendingEffect === 'ALLOW'
                        ? `${selectedUser?.username ?? 'This user'} will be re-granted access to ${pendingService?.name ?? 'this service'}. Referenced services mirror their account source; MANAGED services must be re-subscribed by the user.`
                        : `The override for ${pendingService?.name ?? 'this service'} will be removed and access reverts to the service default.`
                }
                confirmLabel={pendingChoice?.value === 'DENY' ? 'Deny' : pendingChoice?.value === 'ALLOW' ? 'Allow' : 'Reset'}
                variant={pendingChoice?.value === 'DENY' ? 'destructive' : 'default'}
                onConfirm={confirmChoice}
            />
        </div>
    )
}