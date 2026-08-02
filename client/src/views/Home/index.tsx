'use client'

import * as React from "react";
import ServiceCard from "@/views/Home/components/ServiceCard";
import { serviceService, type ServiceResponseDto } from "@/services/service.service";
import { subscriptionService } from "@/services/subscription.service";

export function Home() {
    const [allServices, setAllServices] = React.useState<ServiceResponseDto[]>([])
    const [subscribedServiceIds, setSubscribedServiceIds] = React.useState<number[]>([])

    React.useEffect(() => {
        let cancelled = false

        async function loadServices() {
            const [services, userSubscriptions] = await Promise.all([
                serviceService.getAllServices(),
                subscriptionService.getMySubscriptions(),
            ])
            if (cancelled) return
            setAllServices(services)
            setSubscribedServiceIds(userSubscriptions.map((s) => s.serviceId))
            console.log(`services.length: ${services.length}`)
            console.log(`userSubscriptions.length: ${userSubscriptions}`)
        }

        loadServices()

        return () => {
            cancelled = true
        }
    }, [])

    return (
        <div className="m-3">
            <h2 className="font-bold text-lg">Services</h2>
            
            <div className="w-full flex flex-row flex-wrap justify-center sm:justify-start p-0 m-0">
                {
                    allServices.map((service) => {
                        if(!service.enabled){
                            return null
                        }

                        return <ServiceCard key={service.id} name={service.name} isLocked={!subscribedServiceIds.includes(service.id)} imageUrl={service.imageUrl} url={service.url} className="sm:basis-1/3 lg:basis-1/4" />
                    }
                )}
            </div>
        </div>
    )
}