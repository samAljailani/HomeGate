'use client'

import { useRef, useState, type ReactNode } from "react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { cn } from "@/lib/utils";

export interface DropdownMenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items?: DropdownMenuItem[];
  children?: ReactNode;
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
}

export function DropdownMenu({
  trigger,
  items,
  children,
  align = "right",
  className,
  menuClassName,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const handleItemClick = (item: DropdownMenuItem) => {
    item.onClick?.();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex items-center justify-center p-2 -m-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {trigger}
      </button>

      {/* Menu panel */}
      <div
        role="menu"
        aria-hidden={!isOpen}
        className={cn(
          "absolute z-50 mt-2 w-48 origin-top rounded-md bg-dropdown py-1 shadow-lg outline -outline-offset-1 outline-light transition",
          align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
          isOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none",
          menuClassName
        )}
      >
        {items?.map((item, index) => (
          <a
            key={index}
            role="menuitem"
            href={item.href ?? "#"}
            className="block px-4 py-2 text-sm text-secondary hover:bg-dropdown-hover focus:outline-hidden"
            onClick={(e) => {
              if (!item.href) e.preventDefault();
              handleItemClick(item);
            }}
          >
            {item.label}
          </a>
        ))}
        {children}
      </div>
    </div>
  );
}

export default DropdownMenu;
