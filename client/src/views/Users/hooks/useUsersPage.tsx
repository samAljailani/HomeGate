import { useCallback } from "react"
import { useUsersList } from "./useUsersList"
import { useUsersStats } from "./useUsersStats"

export function useUsersPage(){
    const usersList = useUsersList()
    const statsList = useUsersStats()

    const refresh = useCallback(async () => {
        await Promise.all([
            usersList.refresh(),
            statsList.refresh(),
        ])
    }, [])

    return {
        usersList, 
        statsList,
        refresh,
        isLoading: usersList.isLoading || statsList.isLoading
    }
}