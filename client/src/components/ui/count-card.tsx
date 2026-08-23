import { cn } from "@/lib/utils";

export type CountCardTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface CountCardProps {
    title: string;
    count: number | string;
    subtitle?: string;
    tone?: CountCardTone;
    className?: string;
}

const TONE_STYLES: Record<CountCardTone, { accent: string; countColor: string }> = {
    default: { accent: '', countColor: '' },
    success: { accent: 'from-green-500/15 via-green-500/5', countColor: 'text-green-700 dark:text-green-400' },
    warning: { accent: 'from-amber-500/15 via-amber-500/5', countColor: 'text-amber-700 dark:text-amber-400' },
    danger: { accent: 'from-red-500/15 via-red-500/5', countColor: 'text-red-700 dark:text-red-400' },
    info: { accent: 'from-blue-500/15 via-blue-500/5', countColor: 'text-blue-700 dark:text-blue-400' },
};

export function CountCard({ title, count, subtitle, tone = 'default', className }: CountCardProps) {
    const style = TONE_STYLES[tone];

    return (
        <div
            className={cn(
                "flex min-w-0 min-h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-linear-to-br to-card px-1.5 py-2 text-center shadow-sm transition-shadow hover:shadow-md @min-[420px]:min-h-20 @min-[420px]:gap-1.5 @min-[420px]:px-3 @min-[600px]:min-h-24 @min-[600px]:px-4 @min-[600px]:py-4",
                style.accent,
                className
            )}
        >
            <span className="truncate text-[10px] leading-tight font-medium text-foreground @min-[420px]:text-xs @min-[600px]:text-lg">
                {title}
            </span>

            <span className={cn("text-sm text-muted-foreground @min-[420px]:text-lg @min-[600px]:text-2xl", style.countColor)}>
                {count}
            </span>

            {subtitle != null && (
                <span className="truncate text-[9px] leading-tight text-muted-foreground @min-[420px]:text-[10px] @min-[600px]:text-xs">
                    {subtitle}
                </span>
            )}
        </div>
    );
}
