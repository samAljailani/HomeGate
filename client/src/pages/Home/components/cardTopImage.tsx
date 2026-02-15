import { Button } from '@/components/ui/button'
import { IconLock} from '@/components/ui/icons/IconLock'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
// import { cva, type VariantProps } from "class-variance-authority"
import { IconMoreOptions } from '../../../components/ui/icons/IconMoreOptions'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { classNames } from '@/utils/styles'

// const CardTopImageVariants = cva(
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
export function CardTopImage({isLocked = true, className }: { isLocked: boolean, className?: string }) {
  return (
    <div className={classNames("p-2 w-full", className)}>
      <Card className='relative text-muted w-full pt-0 flex flex-col'>
        {
          isLocked &&
          <div className='absolute top-0 left-0 w-full h-full bg-stone-500/50 z-10 flex items-center justify-center rounded-xl'>
            <IconLock className="size-10 "/>
          </div>
        }
        <CardContent className='relative px-0 flex-1 basis-1/4 min-h-0 pt-0 overflow-hidden rounded-t-xl'>
          <img
            src='https://cdn.shadcnstudio.com/ss-assets/components/card/image-2.png?height=280&format=auto'
            alt='Banner'
            className={`w-full h-45 object-cover`}
          />
        </CardContent>
        <CardHeader className="mt-0">
          <DropdownMenu
            className="ml-3 absolute right-2 mt-1"
            trigger={
              <IconMoreOptions className="size-5 cursor-pointer text-primary absolute right-2" />
            }
            items={[
              { label: "Manage subscription", href: "#" },
              { label: "Copy link", href: "#" },
              { label: "Sign out", onClick: () => console.log("Sign out") },
            ]}
          />
          <CardTitle className="line-clamp-1 text-center text-secondary">Jellyfin</CardTitle>
          {/* <CardDescription className="line-clamp-2">Smooth, flowing gradients blending rich reds and blues in an abstract swirl.</CardDescription> */}
        </CardHeader>
        <CardFooter className="gap-3 max-sm:flex-col max-sm:items-stretch justify-end">
          <Button className="h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm lg:h-10 lg:px-6 z-20">{isLocked ? "Sign Up" : "Launch"}</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default CardTopImage
