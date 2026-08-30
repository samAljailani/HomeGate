import { cn } from '@/lib/utils'

interface UsersCountItemProps {
    title: string
    count: number
    status?: string
    className?: string
}

const STATUS_STYLES: Record<string, { accent: string; countColor: string }> = {
    ACTIVE: {
        accent: 'from-green-500/15 via-green-500/5',
        countColor: 'text-green-700 dark:text-green-400',
    },
    PENDING: {
        accent: 'from-blue-500/15 via-blue-500/5',
        countColor: 'text-blue-700 dark:text-blue-400',
    },
    DISABLED: {
        accent: 'from-amber-500/15 via-amber-500/5',
        countColor: 'text-amber-700 dark:text-amber-400',
    },
    DELETED: {
        accent: 'from-red-500/15 via-red-500/5',
        countColor: 'text-red-700 dark:text-red-400',
    },
}

export function UsersCountItem({
    title,
    count,
    status,
    className,
}: UsersCountItemProps) {
    const formattedTitle =
        title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
    const style = STATUS_STYLES[status ?? '']

    return (
        <div
            className={cn(
                'flex min-w-0 min-h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-linear-to-br to-card px-1.5 py-2 text-center shadow-sm transition-shadow hover:shadow-md dark:shadow-white/10 @min-[420px]:min-h-20 @min-[420px]:gap-1.5 @min-[420px]:px-3 @min-[600px]:min-h-24 @min-[600px]:px-4 @min-[600px]:py-4',
                style?.accent,
                className
            )}
        >
            <span className="truncate text-[10px] leading-tight font-medium text-foreground @min-[420px]:text-xs @min-[600px]:text-lg">
                {formattedTitle}
            </span>

            <span
                className={cn(
                    'text-sm text-muted-foreground @min-[420px]:text-lg @min-[600px]:text-2xl',
                    style?.countColor
                )}
            >
                {count}
            </span>
        </div>
    )
}
