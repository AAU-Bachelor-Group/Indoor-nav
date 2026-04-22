import { getRoomTypeMeta, getRoomTypeOutline } from "#/lib/room-types"
import { cn } from "#/lib/utils"
import { Badge } from "./badge"

import type { RoomType } from "#/generated/prisma/enums"

interface RoomTypeBadgeProps {
  type: RoomType
  /**
   * - `bare`: color swatch + icon + label, no container. Used inside
   *   form primitives (Select items) that provide their own chrome.
   * - `pill`: wrapped in a rounded pill with subtle background and ring,
   *   so it reads as a standalone badge against a dark panel.
   * - `search`: compact shadcn-style badge for search result labels.
   */
  variant?: "bare" | "pill" | "search"
  className?: string
}

/**
 * Canonical "room type" display. Single source for the swatch + icon + label
 * combo that the edit form dropdown and the end-user info panel both need.
 */
export const RoomTypeBadge = ({ type, variant = "bare", className }: RoomTypeBadgeProps) => {
  const { label, color, icon: Icon } = getRoomTypeMeta(type)
  const outline = getRoomTypeOutline(type)

  if (variant === "search") {
    const badgeStyle = {
      backgroundColor: `${color}`,
      borderColor: `${outline}`,
      outline,
    }

    return (
      <Badge
        variant="outline"
        className={cn("gap-1.5 border", "px-2 py-0.5 text-[11px] font-medium", className)}
        style={badgeStyle}
      >
        <Icon className="size-3.5" />
        {label}
      </Badge>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        variant === "pill" &&
          "rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-popover-foreground ring-1 ring-white/15",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-3 rounded-sm",
          variant === "pill" ? "ring-1 ring-white/30" : "border border-black/20",
        )}
        style={{ backgroundColor: color }}
      />
      <Icon className={cn("size-4", variant === "bare" && "text-muted-foreground")} />
      {label}
    </span>
  )
}
