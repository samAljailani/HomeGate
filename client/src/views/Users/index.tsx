'use client'

import { useUsersPage } from './hooks/useUsersPage'
import { useUsersTable } from './hooks/useUsersTable'
import { UsersStats } from './components/UsersStats'
import { UsersTable } from './components/UsersTable'


export function AdminUsers() {
    const { usersList, statsList } = useUsersPage()
    const usersTable = useUsersTable({
        patchUser: usersList.patchUser,
        removeUser: usersList.removeUser,
        transitionStatus: statsList.transitionStatus,
        decrement: statsList.decrement,
    })

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Users</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage user accounts, roles, and access.</p>
            </div>
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
