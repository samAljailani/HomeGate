'use client'

import { useUsersPage } from './hooks/useUsersPage'
import { useUsersTable } from './hooks/useUsersTable'
import { UsersStats } from './components/UsersStats'
import { UsersTable } from './components/UsersTable'


export function AdminUsers() {
    const { usersList, statsList, refresh } = useUsersPage()
    const usersTable = useUsersTable({
        patchUser: usersList.patchUser,
        removeUser: usersList.removeUser,
        refresh
    })

    return (
        <div className="py-8 space-y-8">
            <UsersStats
                stats={statsList.stats}
                isLoading={statsList.isLoading}
            />
            <UsersTable
                users={usersList.users}
                isLoading={usersList.isLoading}
                pendingId={usersTable.pendingId}
                onDisable={usersTable.disableUser}
                onEnable={usersTable.enableUser}
                onSoftDelete={usersTable.softDeleteUser}
                onHardDelete={usersTable.hardDeleteUser}
                onSetAdmin={usersTable.setUserAdmin}
            />
        </div>
    )
}
