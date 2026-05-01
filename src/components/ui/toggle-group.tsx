import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#/lib/utils"

import type { ComponentProps } from "react"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1.5 cursor-pointer text-sm font-medium font-serif whitespace-nowrap select-none outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border border-border bg-card text-card-foreground hover:bg-muted data-[pressed]:bg-primary data-[pressed]:text-primary-foreground data-[pressed]:border-primary",
  {
    variants: {
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
)

/**
 * Single- or multi-select toggle row. Wraps base-ui's `ToggleGroup` and
 * styles its children to read as one connected control. The caller drives
 * state via `value` / `onValueChange` (both arrays — `[selected]` for a
 * single-select group).
 */
export const ToggleGroup = ({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive>) => (
  <ToggleGroupPrimitive
    data-slot="toggle-group"
    className={cn(
      "inline-flex isolate rounded-md",
      "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:-ml-px",
      "[&>*:not(:last-child)]:rounded-r-none",
      "[&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md",
      "[&>*[data-pressed]]:z-10 [&>*:focus-visible]:z-10",
      className,
    )}
    {...props}
  />
)

export const ToggleGroupItem = ({
  className,
  size,
  ...props
}: ComponentProps<typeof TogglePrimitive> & VariantProps<typeof toggleVariants>) => (
  <TogglePrimitive
    data-slot="toggle-group-item"
    className={cn(toggleVariants({ size }), className)}
    {...props}
  />
)
