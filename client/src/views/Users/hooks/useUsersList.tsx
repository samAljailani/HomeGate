import { UserResponseForAdminDto, userService } from "@/services/user.service"
import { useCallback, useEffect, useState } from "react"

export function useUsersList(){
    const [isLoading, setIsLoading ] = useState(true)
    const [users, setUsers] = useState<UserResponseForAdminDto[]>([])
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try{
            setIsLoading(true)
            setError(null)
            const users = await userService.getAllUsers()
            setUsers(users)
        }catch{
            setError("Failed to load users")
        }finally{
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return {
        users,
        isLoading, 
        error,
        refresh: load
    }
}