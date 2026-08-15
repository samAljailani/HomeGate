'use client'

import { useEffect, useState, type JSX } from 'react'
import { classNames } from '@/utils/styles'
import { IconHamburger } from '@/components/ui/icons/IconHamburger'
import { IconX } from '@/components/ui/icons/IconX'
import { IconBell } from '@/components/ui/icons/IconBell'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { authService } from '@/services/auth.service'
import { config } from '@/constants/app'
import { NavItem, NavItemLink } from './navItem'

const navigationDefaults: NavItem[] = [
    { name: 'Dashboard', href: config.routes.home, current: true },
    {
        name: 'Admin',
        current: false,
        dropdownItems: [{ label: 'invites', href: config.routes.invites }],
    },
]

export default function NavBar(): JSX.Element {
    const [mobileOpen, setMobileOpen] = useState<boolean>(false)
    const [navigation, setNavigation] = useState(navigationDefaults)

    useEffect(() => {
        const path = window.location.pathname.replace(/\.html$/, '')
        setNavigation((items) =>
            items.map((item) => {
                const href = item.href?.replace(/\.html$/, '')
                // Also highlight parent if any dropdown child matches the current path
                const childMatch = item.dropdownItems?.some((child) => {
                    const childHref = child.href?.replace(/\.html$/, '')
                    return childHref && path.startsWith(childHref)
                })
                if (!href && !childMatch) return item
                const current =
                    childMatch ||
                    (href === '/'
                        ? path === '/'
                        : !!href && path.startsWith(href))
                return { ...item, current }
            })
        )
    }, [])

    return (
        <nav className="relative bg-nav after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-divider">
            <div className="mx-auto max-w-[1600px] px-2 sm:px-6 lg:px-8">
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
                        <div className="flex shrink-0 items-center">
                            <img
                                alt="Your Company"
                                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                                className="h-8 w-auto"
                            />
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
                        <button
                            type="button"
                            className="relative rounded-full p-1 text-muted hover:text-nav focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                        >
                            <span className="absolute -inset-1.5" />
                            <span className="sr-only">View notifications</span>
                            <IconBell className="size-6" />
                        </button>

                        {/* Profile dropdown */}
                        <DropdownMenu
                            className="ml-3"
                            trigger={
                                <>
                                    <span className="absolute -inset-1.5" />
                                    <span className="sr-only">
                                        Open user menu
                                    </span>
                                    <img
                                        alt=""
                                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                        className="size-8 rounded-full bg-nav-active outline -outline-offset-1 outline-default"
                                    />
                                </>
                            }
                            items={[
                                { label: 'Your profile', href: '/profile' },
                                { label: 'Settings', href: '/settings' },
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
