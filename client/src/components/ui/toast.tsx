'use client'

import * as React from 'react'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    XIcon,
    CircleCheckIcon,
    InfoIcon,
    TriangleAlertIcon,
    OctagonXIcon,
    Loader2Icon,
} from '@/components/ui/icons'

const toast = ToastPrimitive.createToastManager()

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
    return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
    return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
    return (
        <ToastPrimitive.Viewport
            data-slot="toast-viewport"
            className={cn(
                'pointer-events-none fixed inset-x-4 bottom-4 z-100 mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full',
                className
            )}
            {...props}
        />
    )
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
    return (
        <ToastPrimitive.Root
            data-slot="toast"
            className={cn(
                'group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lg will-change-transform outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                'data-[type=success]:border-green-500/30 data-[type=success]:bg-green-50 data-[type=success]:text-green-900 dark:data-[type=success]:border-green-500/50 dark:data-[type=success]:bg-green-950 dark:data-[type=success]:text-green-100',
                'data-[type=info]:border-blue-500/30 data-[type=info]:bg-blue-50 data-[type=info]:text-blue-900 dark:data-[type=info]:border-blue-500/50 dark:data-[type=info]:bg-blue-950 dark:data-[type=info]:text-blue-100',
                'data-[type=warning]:border-amber-500/30 data-[type=warning]:bg-amber-50 data-[type=warning]:text-amber-900 dark:data-[type=warning]:border-amber-500/50 dark:data-[type=warning]:bg-amber-950 dark:data-[type=warning]:text-amber-100',
                'data-[type=error]:border-red-500/30 data-[type=error]:bg-red-50 data-[type=error]:text-red-900 dark:data-[type=error]:border-red-500/50 dark:data-[type=error]:bg-red-950 dark:data-[type=error]:text-red-100',
                '[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]',
                'h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]',
                "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
                'data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]',
                'data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]',
                '[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]',
                'data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]',
                'data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
                'data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
                'data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]',
                'data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]',
                'data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]',
                'data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
                'data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]',
                className
            )}
            {...props}
        />
    )
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
    return (
        <ToastPrimitive.Content
            data-slot="toast-content"
            className={cn(
                'flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100',
                className
            )}
            {...props}
        />
    )
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
    return (
        <ToastPrimitive.Title
            data-slot="toast-title"
            className={cn('text-sm font-medium', className)}
            {...props}
        />
    )
}

function ToastDescription({
    className,
    ...props
}: ToastPrimitive.Description.Props) {
    return (
        <ToastPrimitive.Description
            data-slot="toast-description"
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    )
}

function ToastAction({
    className,
    render = <Button variant="outline" size="sm" />,
    ...props
}: ToastPrimitive.Action.Props) {
    return (
        <ToastPrimitive.Action
            data-slot="toast-action"
            render={render}
            className={cn('shrink-0', className)}
            {...props}
        />
    )
}

function ToastClose({
    className,
    children,
    render = <Button variant="ghost" size="icon-sm" />,
    ...props
}: ToastPrimitive.Close.Props) {
    return (
        <ToastPrimitive.Close
            data-slot="toast-close"
            aria-label="Close toast"
            render={render}
            className={cn(
                "relative shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground",
                className
            )}
            {...props}
        >
            {children ?? <XIcon aria-hidden="true" />}
        </ToastPrimitive.Close>
    )
}

function ToastIcon({ type }: { type: string | undefined }) {
    let icon: React.ReactNode = null

    if (type === 'success') {
        icon = <CircleCheckIcon className="text-green-600 dark:text-green-400" aria-hidden="true" />
    }

    if (type === 'info') {
        icon = <InfoIcon className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
    }

    if (type === 'warning') {
        icon = <TriangleAlertIcon className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
    }

    if (type === 'error') {
        icon = <OctagonXIcon className="text-destructive" aria-hidden="true" />
    }

    if (type === 'loading') {
        icon = <Loader2Icon className="animate-spin" aria-hidden="true" />
    }

    if (!icon) {
        return null
    }

    return (
        <span
            data-slot="toast-icon"
            className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
        >
            {icon}
        </span>
    )
}

const PROGRESS_BAR_COLORS: Record<string, string> = {
    success: 'bg-green-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    error: 'bg-destructive',
}

function ToastProgress({ type, timeout }: { type: string | undefined; timeout: number | undefined }) {
    // The toast object only reflects an explicitly-passed `timeout`; base-ui applies its own
    // default (5000ms) internally without writing it back, so mirror that default here.
    const duration = timeout ?? 5000
    const [shrunk, setShrunk] = React.useState(false)

    React.useEffect(() => {
        setShrunk(false)
        const raf = requestAnimationFrame(() => setShrunk(true))
        return () => cancelAnimationFrame(raf)
    }, [duration])

    if (timeout === 0) {
        return null
    }

    return (
        <div
            data-slot="toast-progress"
            className="absolute inset-x-0 bottom-0 h-1 bg-black/10 dark:bg-white/10"
        >
            <div
                className={cn('h-full origin-left', PROGRESS_BAR_COLORS[type ?? ''] ?? 'bg-foreground/40')}
                style={{
                    transform: shrunk ? 'scaleX(0)' : 'scaleX(1)',
                    transitionProperty: 'transform',
                    transitionTimingFunction: 'linear',
                    transitionDuration: `${duration}ms`,
                }}
            />
        </div>
    )
}

function ToastList() {
    const { toasts } = ToastPrimitive.useToastManager()

    return toasts.map((toastItem) => (
        <Toast key={toastItem.id} toast={toastItem}>
            <ToastContent>
                <ToastIcon type={toastItem.type} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <ToastTitle />
                    <ToastDescription />
                </div>
                <ToastAction />
                <ToastClose />
            </ToastContent>
            <ToastProgress type={toastItem.type} timeout={toastItem.timeout} />
        </Toast>
    ))
}

function Toaster({
    children,
    toastManager = toast,
    ...props
}: ToastPrimitive.Provider.Props) {
    return (
        <ToastProvider toastManager={toastManager} {...props}>
            {children}
            <ToastPortal>
                <ToastViewport>
                    <ToastList />
                </ToastViewport>
            </ToastPortal>
        </ToastProvider>
    )
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
    Toaster,
    Toast,
    ToastAction,
    ToastClose,
    ToastContent,
    ToastDescription,
    ToastPortal,
    ToastProvider,
    ToastTitle,
    ToastViewport,
    createToastManager,
    toast,
    useToastManager,
}
