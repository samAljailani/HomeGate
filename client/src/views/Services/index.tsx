'use client'

import { useServicesPage } from './hooks/useServicesPage'
import { useServicesTable } from './hooks/useServicesTable'
import { ServicesTable } from './components/ServicesTable'

export function AdminServices() {
    const { services, isLoading, patchService } = useServicesPage()
    const servicesTable = useServicesTable({ patchService })

    return (
        <div className="py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Services</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage integrated services and their availability.</p>
            </div>

            <ServicesTable
                services={services}
                isLoading={isLoading}
                pendingName={servicesTable.pendingName}
                onUpdate={servicesTable.updateService}
            />
        </div>
    )
}
