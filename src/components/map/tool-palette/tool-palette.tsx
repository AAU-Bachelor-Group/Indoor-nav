import { useMap } from "#/lib/map-context"
import { TOOL_REGISTRY } from "#/lib/tool-registry"
import { cn } from "@/lib/utils"

import { ToolButton } from "./tool-button"

import type { ToolId } from "#/lib/tool-registry"

interface ToolPaletteProps {
  className?: string
}

/**
 * Tools exposed in the palette today. The registry includes future tools
 * (e.g. `connect-edge`) that aren't wired yet — drop an id in here once its
 * implementation lands.
 */
const VISIBLE_TOOLS: ToolId[] = ["default", "draw-room", "edit-room", "draw-node"]

/**
 * Vertical tool palette on the left edge of the map. Exactly one tool can be
 * active at a time; clicking the active tool reverts to the default tool.
 * Contextual actions for the active tool live in the `ActionBar` at the
 * bottom-center.
 */
export const ToolPalette = ({ className }: ToolPaletteProps) => {
  const { activeTool, setActiveTool } = useMap()

  const visibleTools = TOOL_REGISTRY.filter((t) => VISIBLE_TOOLS.includes(t.id))

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      role="toolbar"
      aria-label="Map editing tools"
    >
      {visibleTools.map((tool) => {
        const Icon = tool.icon
        const isActive = activeTool === tool.id
        const displayLabel = isActive && tool.id === "default" ? tool.activeLabel : tool.label
        return (
          <ToolButton
            key={tool.id}
            icon={<Icon className="size-6 text-white" />}
            label={displayLabel}
            active={isActive}
            isDefault={tool.id === "default"}
            onClick={() => {
              setActiveTool(isActive ? "default" : tool.id)
            }}
          />
        )
      })}
    </div>
  )
}
