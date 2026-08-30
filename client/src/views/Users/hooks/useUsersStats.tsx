import { userService, UserStatsResponseDto, UserStatus } from "@/services/user.service"
import { useCallback, useEffect, useState } from "react"
import { getErrorMessage } from "@/lib/utils"

export function useUsersStats(){
    const [isLoading, setIsLoading ] = useState(true)
    const [stats, setStats] = useState<UserStatsResponseDto>()
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try{
            setIsLoading(true)
            setError(null)
            const stats = await userService.getUserStats()
            setStats(stats)
        }catch(error){
            setError(getErrorMessage(error, "Failed to load user statistics"))
        }finally{
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    // Moves one user between status buckets without refetching.
    const transitionStatus = useCallback((from: UserStatus, to: UserStatus) => {
        setStats((prev) => {
            if (!prev) return prev
            const byStatus = prev.byStatus.map((s) => {
                if (s.status === from) return { ...s, count: Math.max(0, s.count - 1) }
                if (s.status === to) return { ...s, count: s.count + 1 }
                return s
            })
            return { ...prev, byStatus }
        })
    }, [])

    // Hard delete: remove one from the given status bucket and the total.
    const decrement = useCallback((status: UserStatus) => {
        setStats((prev) => {
            if (!prev) return prev
            return {
                total: Math.max(0, prev.total - 1),
                byStatus: prev.byStatus.map((s) =>
                    s.status === status ? { ...s, count: Math.max(0, s.count - 1) } : s
                ),
            }
        })
    }, [])

    return {
        stats,
        isLoading, 
        error,
        refresh: load,
        transitionStatus,
        decrement,
    }
}