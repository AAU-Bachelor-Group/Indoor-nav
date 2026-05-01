import { cn } from "#/lib/utils"

import type { ComponentPropsWithoutRef } from "react"

interface ButtonGroupProps extends ComponentPropsWithoutRef<"div"> {
  orientation?: "horizontal" | "vertical"
}

/**
 * Visual container for a row (or column) of related buttons. Adjacent
 * children are squared off where they meet so they read as a single
 * connected control. Each button still owns its own state — toggle
 * semantics are the caller's responsibility (e.g. via `aria-pressed`).
 */
export const ButtonGroup = ({
  className,
  orientation = "horizontal",
  children,
  ...props
}: ButtonGroupProps) => (
  <div
    role="group"
    data-orientation={orientation}
    className={cn(
      "inline-flex isolate",
      orientation === "horizontal"
        ? "flex-row [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:-ml-px [&>*:not(:last-child)]:rounded-r-none"
        : "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:-mt-px [&>*:not(:last-child)]:rounded-b-none",
      "[&>*:focus-visible]:z-10",
      className,
    )}
    {...props}
  >
    {children}
  </div>
)

export const ButtonGroupSeparator = ({
  className,
  orientation = "vertical",
  ...props
}: ComponentPropsWithoutRef<"div"> & { orientation?: "horizontal" | "vertical" }) => (
  <div
    role="separator"
    aria-orientation={orientation}
    className={cn(
      "bg-border self-stretch",
      orientation === "vertical" ? "w-px" : "h-px",
      className,
    )}
    {...props}
  />
)

export const ButtonGroupText = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) => (
  <span
    className={cn(
      "inline-flex items-center px-3 text-sm text-muted-foreground bg-card border border-border",
      className,
    )}
    {...props}
  />
)
