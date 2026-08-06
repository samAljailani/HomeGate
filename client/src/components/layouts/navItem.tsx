import { DropdownMenu, DropdownMenuItem } from "@/components/ui/DropdownMenu";
import { classNames } from "@/utils/styles";
import { JSX } from "react/jsx-runtime";

export interface NavItem {
  name: string;
  href?: string;
  current: boolean;
  //onClick?: () => void
  dropdownItems?: DropdownMenuItem[] 
}

interface NavItemLinkProps {
    item: NavItem;
    className?: string;
}

export function NavItemLink({ item, className }: NavItemLinkProps): JSX.Element {
    let linkItem = (
        <a
            key={item.name}
            href={item.href}
            aria-current={item.current ? "page" : undefined}
            className={classNames(
                item.current
                    ? "bg-nav-active text-nav-active"
                    : "text-nav hover:bg-nav hover:text-nav",
                className ?? "rounded-md px-3 py-2 text-sm font-medium"
            )}
        >{item.name}</a>
    )

    console.log(`${item.dropdownItems?.length}, ${item.dropdownItems?.length }`)
    return item.dropdownItems?.length ? (
        <DropdownMenu
            className="ml-3"
            trigger={linkItem}
            items={item.dropdownItems}
        />
    ) : linkItem
}