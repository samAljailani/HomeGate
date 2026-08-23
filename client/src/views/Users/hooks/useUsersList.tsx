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

    const patchUser = useCallback((id: string, patch: Partial<UserResponseForAdminDto>) => {
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u))
    }, [])

    const removeUser = useCallback((id: string) => {
        setUsers((prev) => prev.filter((u) => u.id !== id))
    }, [])

    return {
        users,
        isLoading, 
        error,
        refresh: load,
        patchUser,
        removeUser,
    }
}