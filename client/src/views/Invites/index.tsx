'use client'

import { useState, useEffect } from 'react'
import { useInviteList } from '@/views/Invites/hooks/useInviteList'
import { useInviteGenerator } from '@/views/Invites/hooks/useInviteGenerator'
import { useInviteTable } from '@/views/Invites/hooks/useInviteTable'
import { serviceService } from '@/services/service.service'
import { InviteGenerator } from './components/InviteGenerator'
import { InviteTable } from './components/InviteTable'

export function AdminInvites() {
    const { invites, isLoading, error: listError, refresh } = useInviteList()
    const generator = useInviteGenerator(refresh)
    const table = useInviteTable(refresh)
    const [serviceOptions, setServiceOptions] = useState<string[]>([])

    useEffect(() => {
        serviceService.getAllServices().then((services) => {
            setServiceOptions(services.map((s) => s.name))
        }).catch((e) => { console.error('Failed to load services:', e) })
    }, [])

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Invites</h1>
                <p className="mt-1 text-sm text-muted-foreground">Generate and manage invitation links.</p>
            </div>

            <div className="max-w-7xl">
                <InviteGenerator
                    email={generator.email}
                    onEmailChange={generator.setEmail}
                    expiresInDays={generator.expiresInDays}
                    onExpiresInDaysChange={generator.setExpiresInDays}
                    isAdmin={generator.isAdmin}
                    onIsAdminChange={generator.setIsAdmin}
                    accounts={generator.accounts}
                    serviceOptions={serviceOptions}
                    onAddAccount={generator.addAccount}
                    onRemoveAccount={generator.removeAccount}
                    onUpdateAccount={generator.updateAccount}
                    generatedLink={generator.generatedLink}
                    isGenerating={generator.isGenerating}
                    error={generator.error}
                    fieldErrors={generator.fieldErrors}
                    copied={generator.copied}
                    onGenerate={generator.generate}
                    onCopyLink={generator.copyLink}
                />
            </div>

            {listError && <p className="text-sm text-destructive">{listError}</p>}
            {table.actionError && <p className="text-sm text-destructive">{table.actionError}</p>}

            <InviteTable
                invites={invites}
                isLoading={isLoading}
                editingId={table.editingId}
                editDraft={table.editDraft}
                onStartEdit={table.startEdit}
                onDiscardEdit={table.discardEdit}
                onSaveEdit={table.saveEdit}
                onUpdateDraft={table.updateDraft}
                onDuplicate={table.duplicateInvite}
                onDelete={table.deleteInvite}
            />
        </div>
    )
}
