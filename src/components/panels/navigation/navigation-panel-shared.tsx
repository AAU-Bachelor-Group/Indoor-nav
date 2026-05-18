import { Accessibility, Bug, Circle, Crosshair, MapPin, Route, Zap } from "lucide-react"

import type { SearchResultItem } from "#/components/ui/search-result-list"
import type { FieldKey, NavigationDebug } from "#/lib/navigation-context"
import type { RoutePreference } from "#/types/navigation"
import type { LucideIcon } from "lucide-react"

export type { FieldKey }

export interface FieldConfig {
  key: FieldKey
  icon: LucideIcon
  placeholder: string
  ariaLabel: string
}

/** Fields rendered (in order) at the top of the navigation panel. */
export const FIELDS: FieldConfig[] = [
  { key: "start", icon: Circle, placeholder: "Choose start location", ariaLabel: "Start location" },
  {
    key: "destination",
    icon: MapPin,
    placeholder: "Search destination",
    ariaLabel: "Destination",
  },
]

/** Human-readable name for each field, used in headers and result captions. */
export const FIELD_LABEL: Record<FieldKey, string> = {
  start: "start location",
  destination: "destination",
}

interface PreferenceOption {
  value: RoutePreference
  label: string
  icon: LucideIcon
}

/** Routing preference choices shown as a single-select toggle group. */
export const PREFERENCE_OPTIONS: PreferenceOption[] = [
  { value: "SIMPLE", label: "Simple", icon: Route },
  { value: "FAST", label: "Fast", icon: Zap },
  { value: "ACCESSIBLE", label: "Accessible", icon: Accessibility },
]

/** Static "pick a point on the floor plan" row shown above start results. */
export const SELECT_ON_MAP_ITEM: SearchResultItem = {
  id: "Select on map",
  icon: <Crosshair className="w-5 h-5 text-white" />,
  iconBgStyle: { backgroundColor: "var(--color-primary)" },
  title: "",
  type: "Pick a point on the floor plan",
}

/**
 * Vertical 3-dot connector between the two field icons. Aligned to the
 * leading-icon column of the SearchField (px-4 + half icon).
 */
export const DotConnector = () => (
  <div className="flex pl-4 my-2.5">
    <div className="flex w-5 flex-col items-center gap-1.5 py-0.5">
      <div className="size-1 rounded-full bg-muted-foreground/60" />
      <div className="size-1 rounded-full bg-muted-foreground/60" />
      <div className="size-1 rounded-full bg-muted-foreground/60" />
    </div>
  </div>
)

const fmt = (n: number | null, digits = 0): string => (n === null ? "—" : n.toFixed(digits))

/**
 * Read-only debug strip rendered beneath the route summary when
 * `MapContext.debugMode` is on. Shows only what isn't already in the
 * user-facing route info (distance, walk time, floor changes, profile).
 */
export const NavigationDebugBody = ({ debug }: { debug: NavigationDebug }) => {
  const m = debug.algorithm
  return (
    <div className="flex flex-col gap-2 border-t border-white/10 px-5 py-4 font-mono text-xs text-popover-foreground/80">
      <div className="flex items-center gap-2 font-sans text-sm font-semibold text-popover-foreground">
        <Bug className="size-4" />
        <span>A* debug</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>algorithm</span>
        <span className="text-right">{m.durationMs.toFixed(2)} ms</span>
        <span>round-trip</span>
        <span className="text-right">{debug.roundTripMs.toFixed(2)} ms</span>
        <span>turns</span>
        <span className="text-right">{fmt(m.turns)}</span>
        <span>detour ratio</span>
        <span className="text-right">{fmt(m.detourRatio, 3)}</span>
      </div>
    </div>
  )
}
