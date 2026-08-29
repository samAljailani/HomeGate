'use client'

import { useState } from 'react'
import { useServicesPage } from './hooks/useServicesPage'
import { useServicesTable } from './hooks/useServicesTable'
import { ServicesTable } from './components/ServicesTable'
import { ServiceCreateDialog } from './components/ServiceCreateDialog'
import { Button } from '@/components/ui/button'

export function AdminServices() {
    const { services, isLoading, patchService, refresh } = useServicesPage()
    const servicesTable = useServicesTable({ patchService })
    const [createOpen, setCreateOpen] = useState(false)

    return (
        <div className="py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Services</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manage integrated services and their availability.</p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>New Service</Button>
            </div>

            <ServicesTable
                services={services}
                isLoading={isLoading}
                pendingName={servicesTable.pendingName}
                onUpdate={servicesTable.updateService}
            />

            <ServiceCreateDialog
                open={createOpen}
                setOpen={setCreateOpen}
                services={services}
                onCreated={refresh}
            />
        </div>
    )
}
