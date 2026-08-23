'use client'

import ServiceCard from '@/views/Home/components/ServiceCard'
import { Spinner } from '@/components/ui/spinner'
import { useHomePage } from '@/views/Home/hooks/useHomePage'

export function Home() {
    const { services, subscribedServiceIds, isLoading } = useHomePage()

    return (
        <div className="my-3">
            <h2 className="font-bold text-lg">Services</h2>

            {isLoading ? (
                <div className="flex min-h-40 w-full items-center justify-center">
                    <Spinner className="size-10" />
                </div>
            ) : (
                <div className="w-full flex flex-row flex-wrap justify-center sm:justify-start p-0 m-0">
                    {services.map((service) => {
                        if (!service.enabled) {
                            return null
                        }

                        return (
                            <ServiceCard
                                key={service.id}
                                serviceId={service.id}
                                name={service.name}
                                isLocked={
                                    !subscribedServiceIds.includes(service.id)
                                }
                                imageUrl={service.imageUrl}
                                url={service.url}
                                className="sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}
