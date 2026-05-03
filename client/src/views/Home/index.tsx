import CardTopImage from "@/views/Home/components/cardTopImage";

export function Home() {
    return (
        <div className="m-3">
            <h2 className="font-bold text-lg">Services</h2>
            
            <div className="w-full flex flex-row flex-wrap justify-center sm:justify-start p-0 m-0">
                <CardTopImage isLocked={true} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
                <CardTopImage isLocked={false} className="sm:basis-1/3 lg:basis-1/4" />
            </div>
        </div>
    )
}