import { Spinner } from "@/components/ui/spinner";
import { UserStatsResponseDto } from "@/services/user.service";
import { UsersCountItem } from "./UserCountItem";

interface UsersStatsProps {
    stats: UserStatsResponseDto | undefined,
    isLoading: boolean,
    error?: string
}

export function UsersStats({stats, isLoading, error} : UsersStatsProps) {
    void error
    if (isLoading) {
        return (
            <div className="flex min-h-16 w-full items-center justify-center @min-[420px]:min-h-20 @min-[600px]:min-h-24">
                <Spinner className="size-10" />
            </div>
        )
    }

    return (
        <div className="@container">
            <div className="grid grid-cols-4 gap-1.5 @min-[420px]:gap-2 @min-[600px]:gap-4">
                    {stats?.byStatus.map((item) => (
                        <UsersCountItem
                            key={item.status}
                            title={item.status}
                            count={item.count}
                            status={item.status}
                        />
                    ))}
                </div>
        </div>
    )
}