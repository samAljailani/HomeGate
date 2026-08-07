'use client'

import ServiceCard from "@/views/Home/components/ServiceCard";
import { useHomeViewModel } from "./useHomeViewModel";

export function Home() {
    const { services, subscribedServiceIds, loading } = useHomeViewModel()

    if (loading) return null

    return (
        <div className="m-3">
            <h2 className="font-bold text-lg">Services</h2>
            
            <div className="w-full flex flex-row flex-wrap justify-center sm:justify-start p-0 m-0">
                {services.map((service) => (
                    <ServiceCard 
                        key={service.id} 
                        serviceId={service.id}
                        name={service.name} 
                        isLocked={!subscribedServiceIds.includes(service.id)} 
                        imageUrl={service.imageUrl} 
                        url={service.url} 
                        className="sm:basis-1/3 lg:basis-1/4"
                    />
                ))}
            </div>
        </div>
    )
}