'use client'

import { useState, useCallback } from 'react'
import { inviteService, type InviteResponseDto, type InvitePatchRequestDto, type InviteAccountDto } from '@/services/invite.service'
import { addToastMessage, getErrorMessage } from '@/lib/utils'

export interface EditingState {
    id: string
    isNew: boolean
    email: string
    expiresAt: string
    expiresInDays: number
    revoked: boolean
    isAdmin: boolean
    accounts: InviteAccountDto[]
}

export function useInviteTable(refresh: () => void) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editDraft, setEditDraft] = useState<EditingState | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)

    const startEdit = useCallback((invite: InviteResponseDto) => {
        setEditingId(invite.id)
        setEditDraft({
            id: invite.id,
            isNew: false,
            email: invite.email ?? '',
            expiresAt: invite.expiresAt,
            expiresInDays: 7,
            revoked: !!invite.revokedAt,
            isAdmin: invite.isAdmin,
            accounts: invite.accounts ?? [],
        })
        setActionError(null)
    }, [])

    const discardEdit = useCallback(() => {
        setEditingId(null)
        setEditDraft(null)
    }, [])

    const saveEdit = useCallback(async () => {
        if (!editDraft) return
        setActionError(null)
        try {
            if (editDraft.isNew) {
                await inviteService.createInvite({
                    expiresInDays: editDraft.expiresInDays,
                    ...(editDraft.email ? { email: editDraft.email } : {}),
                    ...(editDraft.accounts.length > 0 ? { accounts: editDraft.accounts } : {}),
                })
            } else {
                const patch: InvitePatchRequestDto = {
                    ...(editDraft.email ? { email: editDraft.email } : {}),
                    expiresAt: editDraft.expiresAt,
                    revoked: editDraft.revoked,
                    isAdmin: editDraft.isAdmin,
                }
                await inviteService.updateInvite(editDraft.id, patch)
            }
            addToastMessage('success', editDraft.isNew ? 'Invite created' : 'Invite updated')
            refresh()
            discardEdit()
        } catch (error) {
            const fallback = editDraft.isNew
                ? 'Failed to create invite'
                : 'Failed to save changes'
            const msg = getErrorMessage(error, fallback)
            setActionError(msg)
            addToastMessage('error', msg)
        }
    }, [editDraft, refresh, discardEdit])

    const updateDraft = useCallback((field: keyof EditingState, value: string | number | boolean) => {
        setEditDraft((prev) => prev ? { ...prev, [field]: value } : prev)
    }, [])

    const duplicateInvite = useCallback((invite: InviteResponseDto) => {
        const tempId = `new-${Date.now()}`
        setEditingId(tempId)
        setEditDraft({
            id: tempId,
            isNew: true,
            email: invite.email ?? '',
            expiresAt: '',
            expiresInDays: 7,
            revoked: false,
            isAdmin: invite.isAdmin,
            accounts: invite.accounts ?? [],
        })
        setActionError(null)
        addToastMessage('info', 'Duplicated invite — edit and save to create')
    }, [])

    const deleteInvite = useCallback(async (id: string) => {
        setActionError(null)
        try {
            await inviteService.deleteInvite(id)
            addToastMessage('success', 'Invite deleted')
            refresh()
        } catch (error) {
            const msg = getErrorMessage(error, 'Failed to delete invite')
            setActionError(msg)
            addToastMessage('error', msg)
        }
    }, [refresh])

    return {
        editingId,
        editDraft,
        actionError,
        startEdit,
        discardEdit,
        saveEdit,
        updateDraft,
        duplicateInvite,
        deleteInvite,
    }
}
