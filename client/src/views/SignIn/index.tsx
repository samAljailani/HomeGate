'use client'

import { ResponsiveModal } from '@/components/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { IconGoogle } from '@/components/ui/icons/IconGoogle'
import { config } from '@/constants/app'
import { authService } from '@/services/auth.service'
import React from 'react'

export function OAuthSignInPage() {
    const [open, setOpen] = React.useState(true)
    const [enabledProviders, setEnabledProviders] = React.useState<string[] | null>(null)

    React.useEffect(() => {
        authService.getEnabledProviders()
            .then(setEnabledProviders)
            .catch(() => setEnabledProviders([]))
    }, [])

    function onOAuthSignInClick(href: string) {
        window.location.href = href
    }

    return (
        <>
            <div className="pointer-events-none fixed inset-x-0 top-1/2 flex -translate-y-[calc(100%+140px)] justify-center gap-0.5 text-3xl font-bold sm:text-4xl">
                {config.appName.split('').map((letter, i) => (
                    <span
                        key={i}
                        className="opacity-0 animate-[letter-fall_0.5s_ease-out_forwards]"
                        style={{ animationDelay: `${i * 0.08}s` }}
                    >
                        {letter}
                    </span>
                ))}
            </div>
            <ResponsiveModal
                open={open}
                setOpen={setOpen}
                showCloseButton={false}
                title="Sign In"
                description="The front door to your digital home"
                className="data-[state=open]:slide-in-from-bottom-1/4 data-[state=open]:duration-500"
            >
                {enabledProviders?.includes('google') && (
                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={() =>
                            onOAuthSignInClick(authService.getGoogleSignInUrl())
                        }
                    >
                        <IconGoogle />
                        Continue with Google
                    </Button>
                )}
                {enabledProviders?.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Sign-in is currently unavailable. Please contact an administrator.
                    </p>
                )}
            </ResponsiveModal>
        </>
    )
}
