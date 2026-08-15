'use client'

import { useState, useCallback } from 'react'
import { inviteService, type CreateInviteResponseDto, type InviteAccountDto } from '@/services/invite.service'
import { authService } from '@/services/auth.service'
import { addToastMessage } from '@/lib/utils'

const emptyAccount = (): InviteAccountDto => ({ serviceName: '', username: '', email: '', accountId: '' })

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface InviteFieldErrors {
    email?: string
    accounts?: Record<number, string>
}

export function useInviteGenerator(onGenerated?: () => void) {
    const [email, setEmail] = useState('')
    const [expiresInDays, setExpiresInDays] = useState(7)
    const [isAdmin, setIsAdmin] = useState(false)
    const [accounts, setAccounts] = useState<InviteAccountDto[]>([])
    const [generatedLink, setGeneratedLink] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<InviteFieldErrors>({})
    const [copied, setCopied] = useState(false)

    const addAccount = useCallback(() => {
        setAccounts((prev) => [...prev, emptyAccount()])
    }, [])

    const removeAccount = useCallback((index: number) => {
        setAccounts((prev) => prev.filter((_, i) => i !== index))
    }, [])

    const updateAccount = useCallback((index: number, field: keyof InviteAccountDto, value: string) => {
        setAccounts((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))
    }, [])

    const validate = useCallback((): boolean => {
        const errors: InviteFieldErrors = {}
        const trimmedEmail = email.trim()

        if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
            errors.email = 'Invalid email address'
        }

        const accountErrors: Record<number, string> = {}
        accounts.forEach((account, index) => {
            if (!account.serviceName.trim()) return
            const accountEmail = account.email?.trim()
            if (accountEmail) {
                if (!trimmedEmail) {
                    accountErrors[index] = 'Attach email is required when account email is provided'
                } else if (accountEmail.toLowerCase() !== trimmedEmail.toLowerCase()) {
                    accountErrors[index] = 'Account email must match the attach email'
                }
            }
        })
        if (Object.keys(accountErrors).length > 0) {
            errors.accounts = accountErrors
        }

        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }, [email, accounts])

    const generate = useCallback(async () => {
        if (!validate()) return

        setIsGenerating(true)
        setError(null)
        setCopied(false)
        try {
            const validAccounts = accounts.filter((a) => a.serviceName.trim())
            const result: CreateInviteResponseDto = await inviteService.createInvite({
                expiresInDays,
                ...(email.trim() ? { email: email.trim() } : {}),
                ...(validAccounts.length > 0 ? { accounts: validAccounts } : {}),
                ...(isAdmin ? { isAdmin: true } : {}),
            })
            const link = authService.getJoinUrl(result.rawToken)
            setGeneratedLink(link)
            addToastMessage('success', 'Invite generated')
            onGenerated?.()
        } catch {
            setError('Failed to generate invite')
            addToastMessage('error', 'Failed to generate invite')
        } finally {
            setIsGenerating(false)
        }
    }, [email, expiresInDays, accounts, isAdmin, onGenerated, validate])

    const copyLink = useCallback(async () => {
        if (!generatedLink) return
        await navigator.clipboard.writeText(generatedLink)
        setCopied(true)
        addToastMessage('success', 'Link copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
    }, [generatedLink])

    const reset = useCallback(() => {
        setEmail('')
        setExpiresInDays(7)
        setIsAdmin(false)
        setAccounts([])
        setGeneratedLink('')
        setError(null)
        setFieldErrors({})
        setCopied(false)
    }, [])

    return {
        email, setEmail,
        expiresInDays, setExpiresInDays,
        isAdmin, setIsAdmin,
        accounts, addAccount, removeAccount, updateAccount,
        generatedLink,
        isGenerating,
        error,
        fieldErrors,
        copied,
        generate,
        copyLink,
        reset,
    }
}
