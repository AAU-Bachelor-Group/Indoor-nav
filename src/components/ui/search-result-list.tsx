import * as React from "react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchResultItem {
  id: string
  /** Icon rendered inside the circular badge */
  icon: React.ReactNode
  /** Background colour of the icon circle (Tailwind class or CSS variable) */
  iconBg?: string
  /** Inline style applied to the icon circle — use for dynamic colours (e.g. hex) */
  iconBgStyle?: React.CSSProperties
  /** Primary label */
  title: string
  /** Type label – e.g. "Lecture room", "Station" */
  type: string
}

export interface SearchResultListProps {
  items: SearchResultItem[]
  onItemClick?: (item: SearchResultItem) => void
  className?: string
  /** Optionally hide the outer rounded card container (useful when embedded) */
  bare?: boolean
}

// ─── Individual result row ────────────────────────────────────────────────────

function ResultRow({
  item,
  onItemClick,
  showSeparator = false,
}: {
  item: SearchResultItem
  onItemClick?: (item: SearchResultItem) => void
  showSeparator?: boolean
}) {
  return (
    <li>
      {showSeparator && <div className="h-px bg-border" aria-hidden="true" />}
      <button
        type="button"
        onClick={() => onItemClick?.(item)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer",
          "hover:bg-muted focus-visible:bg-muted",
          "focus-visible:outline-none",
        )}
      >
        {/* Icon badge */}
        <span
          className={cn(
            "shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center",
            item.iconBgStyle ? undefined : (item.iconBg ?? "bg-primary"),
          )}
          style={item.iconBgStyle}
          aria-hidden="true"
        >
          <span className="text-white w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
            {item.icon}
          </span>
        </span>

        {/* Text block */}
        <span className="flex-1 min-w-0">
          <span className="block font-medium text-foreground text-sm leading-snug truncate">
            {item.id} &nbsp; • &nbsp; {item.title}
          </span>
          {item.type && (
            <span className="block text-xs text-muted-foreground leading-snug truncate mt-0.5">
              {item.type}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SearchResultList({
  items,
  onItemClick,
  className,
  bare = false,
}: SearchResultListProps) {
  if (items.length === 0) return null

  const content = (
    <ul role="listbox" aria-label="Search results">
      {items.map((item, index) => (
        <ResultRow key={item.id} item={item} onItemClick={onItemClick} showSeparator={index > 0} />
      ))}
    </ul>
  )

  if (bare) {
    return (
      <div className={cn("w-full", className)} role="region" aria-label="Search results">
        {content}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "w-full bg-card rounded-sm shadow-md border border-border/60 overflow-hidden",
        className,
      )}
      role="region"
      aria-label="Search results"
    >
      {content}
    </div>
  )
}
