'use client'

import { useState, useMemo, type JSX } from 'react'
import { usePathname } from 'next/navigation'
import { classNames } from '@/utils/styles'
import { IconHamburger } from '@/components/ui/icons/IconHamburger'
import { IconX } from '@/components/ui/icons/IconX'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { authService } from '@/services/auth.service'
import { useAuthContext } from '@/context/auth-context'
import { config } from '@/constants/app'
import { NavItem, NavItemLink } from './navItem'

const navigationItems: NavItem[] = [
    { name: 'Dashboard', href: config.routes.home, current: false },
    { name: 'Subscriptions', href: config.routes.subscriptions, current: false },
    {
        name: 'Admin',
        current: false,
        adminOnly: true,
        dropdownItems: [
            { label: 'dashboard', href: config.routes.adminDashboard },
            { label: 'invites', href: config.routes.invites },
            { label: 'users',   href: config.routes.users },
            { label: 'policies', href: config.routes.policies },
            { label: 'services', href: config.routes.services },
            { label: 'oauth providers', href: config.routes.oauthProviders },
            { label: 'subscriptions', href: config.routes.adminSubscriptions },
            { label: 'logs', href: config.routes.logs },
            { label: 'scheduled tasks', href: config.routes.scheduledTasks },
            { label: 'sessions', href: config.routes.sessions },
        ],
    },
]

export default function NavBar(): JSX.Element {
    const [mobileOpen, setMobileOpen] = useState<boolean>(false)
    const [avatarError, setAvatarError] = useState(false)
    const pathname = usePathname()
    const { user } = useAuthContext()

    const initials = (user?.username ?? '?').slice(0, 2).toUpperCase()
    const showAvatar = !!user?.avatarUrl && !avatarError

    const navigation = useMemo(() =>
        navigationItems
            .filter((item) => !item.adminOnly || user?.isAdmin)
            .map((item) => {
                const href = item.href
                const childMatch = item.dropdownItems?.some((child) =>
                    child.href && pathname.startsWith(child.href)
                )
                if (!href && !childMatch) return item
                const current =
                    childMatch ||
                    (href === '/' ? pathname === '/' : !!href && pathname.startsWith(href))
                return { ...item, current }
            }),
        [pathname, user?.isAdmin]
    )

    return (
        <nav className="relative bg-nav after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-divider">
            <div className="mx-auto px-2 sm:px-6 lg:px-8">
                <div className="relative flex h-16 items-center justify-between">
                    <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                        {/* Mobile menu button */}
                        <button
                            type="button"
                            aria-controls="mobile-menu"
                            aria-expanded={mobileOpen}
                            onClick={() => setMobileOpen((v) => !v)}
                            className="group relative inline-flex items-center justify-center rounded-md p-2 text-muted hover:bg-nav hover:text-nav focus:outline-2 focus:-outline-offset-1 focus:outline-accent"
                        >
                            <span className="absolute -inset-0.5" />
                            <span className="sr-only">Open main menu</span>

                            <span
                                className={classNames(
                                    'size-6',
                                    mobileOpen ? 'hidden' : 'block'
                                )}
                            >
                                <IconHamburger className="size-6" />
                            </span>
                            <span
                                className={classNames(
                                    'size-6',
                                    mobileOpen ? 'block' : 'hidden'
                                )}
                            >
                                <IconX className="size-6" />
                            </span>
                        </button>
                    </div>

                    <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                        <div className="flex shrink-0 items-center gap-2">
                            <img
                                alt="HomeGate"
                                src="/images/logo.svg"
                                className="h-8 w-8"
                            />
                            <span className="hidden sm:block text-lg font-semibold text-nav">
                                {config.appName}
                            </span>
                        </div>

                        <div className="hidden sm:ml-6 sm:block">
                            <div className="flex space-x-4">
                                {navigation.map((item: NavItem) => (
                                    <NavItemLink item={item} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                        <ThemeToggle />

                        {/* Profile dropdown */}
                        <DropdownMenu
                            className="ml-3"
                            trigger={
                                <>
                                    <span className="absolute -inset-1.5" />
                                    <span className="sr-only">
                                        Open user menu
                                    </span>
                                    {showAvatar ? (
                                        <img
                                            alt=""
                                            src={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/users/me/avatar`}
                                            onError={() => setAvatarError(true)}
                                            className="size-8 rounded-full bg-nav-active outline -outline-offset-1 outline-default"
                                        />
                                    ) : (
                                        <span className="flex size-8 items-center justify-center rounded-full bg-nav-active text-xs font-semibold text-nav-active outline -outline-offset-1 outline-default">
                                            {initials}
                                        </span>
                                    )}
                                </>
                            }
                            items={[
                                {
                                    label: 'Sign out',
                                    className: 'text-error',
                                    onClick: async () => {
                                        await authService.logout()
                                        window.location.href =
                                            config.routes.signIn
                                    },
                                },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile panel */}
            <div
                id="mobile-menu"
                className={classNames(
                    'sm:hidden',
                    mobileOpen ? 'block' : 'hidden'
                )}
            >
                <div className="space-y-1 px-2 pt-2 pb-3">
                    {navigation.map((item: NavItem) => (
                        <NavItemLink
                            key={item.name}
                            item={item}
                            className="block rounded-md px-3 py-2 text-base font-medium"
                        />
                    ))}
                </div>
            </div>
        </nav>
    )
}
