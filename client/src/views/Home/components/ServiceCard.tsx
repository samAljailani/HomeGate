'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { IconLock } from '@/components/ui/icons/IconLock'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card'
// import { cva, type VariantProps } from "class-variance-authority"
import { IconMoreOptions } from '../../../components/ui/icons/IconMoreOptions'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { classNames } from '@/utils/styles'
import { SignUpForm } from '@/views/Home/components/SignUp'
import { addToastMessage, capitalizeFirstLetter, copyToClipboard } from '@/lib/utils'
import { config } from '@/constants/app'
import type { ServiceResponseDto } from '@/services/service.service'

// const ServiceCardsVariants = cva(
//   "",
//   {
//     variants: {
//       size: {
//         default: "h-9 px-4 py-2 has-[>svg]:px-3",
//         sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
//         lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
//         icon: "size-9",
//         "icon-sm": "size-8",
//         "icon-lg": "size-10",
//       },
//     },
//     defaultVariants: {
//       size: "default",
//     }
//   }
// )
// export function CardTopImage({isLocked = true, size = "default" }: { isLocked: boolean } & VariantProps<typeof CardTopImageVariants>) {
export interface ServiceCardProps {
    isLocked: boolean
    allowed?: boolean
    accountType?: ServiceResponseDto['accountType']
    requiredInputs?: ServiceResponseDto['requiredInputs']
    className?: string
    /** Service display name, shown as the card title and used for image alt text / fallback initial. */
    name?: string
    /** Admin-configured thumbnail URL for the service (`ServiceResponseDto.imageUrl`), loaded dynamically. */
    imageUrl?: string | null
    /** Admin-configured url to the corresponding service */
    url?: string | null
    /** Id of the service, needed for the Sign Up form submission */
    serviceId: number
}

export function ServiceCard({
    isLocked = true,
    allowed = true,
    accountType,
    requiredInputs,
    className,
    name = 'Service',
    imageUrl,
    url,
    serviceId,
}: ServiceCardProps) {
    const [imageFailed, setImageFailed] = React.useState(false)
    const [signUpOpen, setSignUpOpen] = React.useState(false)
    const showImage = !!imageUrl && !imageFailed

    async function copyServiceLink() {
        if (!url) return

        try {
            await copyToClipboard(url)
            addToastMessage('success', 'Link copied to clipboard')
        } catch {
            addToastMessage('error', 'Failed to copy link')
        }
    }
    const dropDownMenuItems = [
        { label: 'Manage subscription', href: config.routes.account },
        {
            label: 'Copy link',
            onClick: copyServiceLink,
        },
    ]

    let footerButton: React.ReactNode

    if (isLocked) {
        footerButton = (
            <Button
                className="h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm lg:h-10 lg:px-6 z-20"
                onClick={() => setSignUpOpen(true)}
                disabled={!allowed}
            >
                Sign Up
            </Button>
        )
    } else {
        footerButton = (
            <Button
                className="h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm lg:h-10 lg:px-6 z-20"
                onClick={() => {
                    if (url) window.open(url, '_blank', 'noopener,noreferrer')
                }}
            >
                Launch
            </Button>
        )
    }

    return (
        <div className={classNames('px-0.5 py-1 sm:p-2 w-full', className)}>
            <Card className="relative w-full pt-0 flex flex-col rounded-lg border bg-linear-to-br to-card shadow-sm transition-shadow hover:shadow-md">
                {isLocked && (
                    <div className="absolute top-0 left-0 w-full h-full bg-stone-500/50 z-10 flex items-center justify-center rounded-lg">
                        <IconLock className="size-10 " />
                    </div>
                )}
                <CardContent className="relative px-0 pt-0 overflow-hidden rounded-t-lg">
                    {showImage ? (
                        <img
                            src={imageUrl}
                            alt={`${capitalizeFirstLetter(name)} logo`}
                            loading="lazy"
                            className="w-full aspect-video object-cover"
                            onError={() => setImageFailed(true)}
                        />
                    ) : (
                        <div className="w-full aspect-video flex items-center justify-center bg-muted text-muted-foreground text-2xl font-semibold">
                            {capitalizeFirstLetter(name)}
                        </div>
                    )}
                </CardContent>
                <CardHeader className="mt-0">
                    <DropdownMenu
                        className="ml-3 absolute right-2 mt-1"
                        trigger={
                            <IconMoreOptions className="size-5 cursor-pointer text-primary absolute right-2" />
                        }
                        items={dropDownMenuItems}
                    />
                    <CardTitle className="line-clamp-1 text-center text-secondary">
                        {capitalizeFirstLetter(name)}
                    </CardTitle>
                    {/* <CardDescription className="line-clamp-2">Smooth, flowing gradients blending rich reds and blues in an abstract swirl.</CardDescription> */}
                </CardHeader>
                <CardFooter className="gap-3 max-sm:flex-col max-sm:items-stretch justify-end">
                    {footerButton}
                </CardFooter>
            </Card>
            <SignUpForm
                open={signUpOpen}
                setOpen={setSignUpOpen}
                serviceId={serviceId}
                accountType={accountType}
                requiredInputs={requiredInputs}
            />
        </div>
    )
}

export default ServiceCard
