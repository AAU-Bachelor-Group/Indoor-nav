import { LogOut } from "lucide-react"

import { useMap } from "#/lib/map-context"
import { getToolMeta } from "#/lib/tool-registry"
import { cn } from "@/lib/utils"

import { DrawRoomActions } from "./draw-room-actions"
import { PillButton, PillDivider } from "./pill-button"

interface ActionBarProps {
  className?: string
}

/**
 * Contextual action bar shown at the bottom-center while a tool is active.
 *
 * Renders as a single wide pill so all actions for the current tool feel
 * like one UI element:
 * - Left: mode icon + label (from the tool registry).
 * - Middle: tool-specific actions (e.g. undo / discard / snap-to-grid for
 *   draw-room).
 * - Right: an "Exit mode" button that clears `activeTool`.
 *
 * Validation errors float above the pill as a matching toast.
 */
export const ActionBar = ({ className }: ActionBarProps) => {
  const { activeTool, drawing, setActiveTool } = useMap()

  if (activeTool === null) return null

  const { icon: Icon, activeLabel } = getToolMeta(activeTool)
  const validationError = activeTool === "draw-room" ? drawing.validationError : null
  const toolActions = activeTool === "draw-room" ? <DrawRoomActions drawing={drawing} /> : null

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {validationError && (
        <div
          role="alert"
          className="rounded-full border border-red-500/50 bg-red-600/95 px-4 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-sm"
        >
          {validationError}
        </div>
      )}
      <div
        role="toolbar"
        aria-label="Tool actions"
        className={cn(
          "flex items-center gap-1 px-3 py-2",
          "rounded-full bg-primary border border-slate-700/50 shadow-xl backdrop-blur-sm",
        )}
      >
        <span className="flex items-center gap-2 pr-1 text-xs font-semibold text-white">
          <Icon className="size-4" />
          {activeLabel}
        </span>
        {toolActions && (
          <>
            <PillDivider />
            {toolActions}
          </>
        )}
        <PillDivider />
        <PillButton
          icon={<LogOut className="size-4" />}
          label="Exit mode"
          onClick={() => {
            setActiveTool(null)
          }}
        />
      </div>
    </div>
  )
}
