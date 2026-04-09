import { Plus, Trash2, Undo2, X } from "lucide-react"

import { useMap } from "#/lib/map-context"
import { cn } from "@/lib/utils"

import type { RoomDrawingState } from "#/lib/use-room-drawing-state"
import type { ReactNode } from "react"

interface AdminToolbarProps {
  className?: string
}

interface ToolbarButtonProps {
  icon: ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

const ToolbarButton = ({ icon, label, active, disabled, onClick }: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={cn(
      "w-14 h-14 rounded-2xl bg-primary backdrop-blur-sm flex items-center justify-center",
      "transition-all duration-200 shadow-xl border border-slate-700/50",
      "cursor-pointer hover:bg-secondary",
      active && "ring-2 ring-secondary",
      disabled && "opacity-50 cursor-not-allowed hover:bg-primary",
    )}
  >
    {icon}
  </button>
)

interface DrawingActionButtonsProps {
  drawing: RoomDrawingState
}

const DrawingActionButtons = ({ drawing }: DrawingActionButtonsProps) => {
  const canUndo = drawing.vertices.length > 0
  const canDiscard = drawing.vertices.length > 0 || drawing.closed

  return (
    <>
      <ToolbarButton
        icon={<Undo2 className="size-6 text-white" />}
        label="Undo last vertex"
        disabled={!canUndo}
        onClick={drawing.undo}
      />
      <ToolbarButton
        icon={<Trash2 className="size-6 text-white" />}
        label="Discard polygon (stay in draw mode)"
        disabled={!canDiscard}
        onClick={drawing.reset}
      />
    </>
  )
}

/**
 * Admin map-editing toolbar. Vertical column at bottom-left, mirroring the
 * FloorSelector visual language so it sits naturally in the existing UI.
 *
 * One primary button: **Add room** (+). Editing existing rooms is the
 * default behavior — click any saved room while not drawing and the
 * metadata panel opens for it. Adding a new room requires the explicit
 * "+" action so it can't happen by accident.
 *
 * While drawing, two action buttons stack above:
 * - **Undo**: pops the most recent vertex.
 * - **Discard**: clears the in-progress polygon entirely but **stays in
 *   draw mode**, so the admin can immediately start drawing the next room.
 */
export const AdminToolbar = ({ className }: AdminToolbarProps) => {
  const { activeTool, setActiveTool, drawing } = useMap()
  const drawingRoom = activeTool === "draw-room"
  const showValidationError = drawingRoom && drawing.validationError !== null

  return (
    <div
      className={cn("flex flex-col-reverse gap-2", className)}
      role="toolbar"
      aria-label="Admin map tools"
    >
      <ToolbarButton
        icon={
          drawingRoom ? (
            <X className="size-6 text-white" />
          ) : (
            <Plus className="size-6 text-white" />
          )
        }
        label={drawingRoom ? "Cancel drawing" : "Add room"}
        active={drawingRoom}
        onClick={() => {
          setActiveTool(drawingRoom ? null : "draw-room")
        }}
      />

      {drawingRoom && <DrawingActionButtons drawing={drawing} />}

      {showValidationError && (
        <div
          role="alert"
          className="max-w-[14rem] rounded-xl border border-red-500/50 bg-red-600/95 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-sm"
        >
          {drawing.validationError}
        </div>
      )}
    </div>
  )
}
