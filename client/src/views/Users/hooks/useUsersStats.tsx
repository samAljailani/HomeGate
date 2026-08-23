import { userService, UserStatsResponseDto } from "@/services/user.service"
import { useCallback, useEffect, useState } from "react"

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
        }catch{
            setError("Failed to load user statistics")
        }finally{
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return {
        stats,
        isLoading, 
        error,
        refresh: load
    }
}