import { cn } from "@/lib/utils"

export type StatusBadgeTone = "success" | "info" | "warning" | "error" | "neutral"

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
    success: "bg-green-500/15 text-green-700 dark:text-green-400",
    info: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    error: "bg-red-500/15 text-red-700 dark:text-red-400",
    neutral: "bg-muted text-muted-foreground",
}

interface StatusBadgeProps {
    tone: StatusBadgeTone
    children: React.ReactNode
    className?: string
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
    return (
        <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", TONE_CLASSES[tone], className)}>
            {children}
        </span>
    )
}
