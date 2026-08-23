import { useUsersList } from "./useUsersList"
import { useUsersStats } from "./useUsersStats"

export function useUsersPage(){
    const usersList = useUsersList()
    const statsList = useUsersStats()

    return {
        usersList, 
        statsList,
        isLoading: usersList.isLoading || statsList.isLoading
    }
}