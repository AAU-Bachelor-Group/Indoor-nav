import { Grid3x3, Pentagon, Square, Trash2, Undo2 } from "lucide-react"

import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"
import { useMap } from "#/lib/map-context"

import { PillButton, PillDivider } from "./pill-button"

import type { RoomDrawingState } from "#/components/hooks/use-room-drawing-state"

interface DrawRoomActionsProps {
  drawing: RoomDrawingState
}

export const DrawRoomActions = ({ drawing }: DrawRoomActionsProps) => {
  const { snapToGrid, setSnapToGrid, roomDrawMode, setRoomDrawMode } = useMap()
  const rectangleMode = roomDrawMode === "rectangle"
  const canUndo = drawing.vertices.length > 0
  const canDiscard = drawing.vertices.length > 0 || drawing.closed

  const gridTooltip = snapToGrid ? "Disable grid snap" : "Enable grid snap"
  const shapeTooltip = rectangleMode ? "Switch to polygon drawing" : "Switch to rectangle drawing"

  return (
    <>
      <PillButton
        icon={<Undo2 className="size-5" />}
        label="Undo last vertex"
        disabled={rectangleMode || !canUndo}
        onClick={drawing.undo}
      />
      <PillDivider />
      <PillButton
        icon={<Trash2 className="size-5" />}
        label="Discard polygon (stay in draw mode)"
        disabled={!canDiscard}
        onClick={drawing.reset}
      />
      <PillDivider />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="toolbar"
              size="icon-round"
              type="button"
              onClick={() => {
                setSnapToGrid(!snapToGrid)
              }}
              aria-pressed={snapToGrid}
              aria-label={gridTooltip}
            >
              <Grid3x3 className="size-5" />
            </Button>
          }
        />
        <TooltipContent side="top">{gridTooltip}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="toolbar"
              size="icon-round"
              type="button"
              onClick={() => {
                setRoomDrawMode(rectangleMode ? "polygon" : "rectangle")
              }}
              aria-pressed={rectangleMode}
              aria-label={shapeTooltip}
            >
              {rectangleMode ? <Square className="size-5" /> : <Pentagon className="size-5" />}
            </Button>
          }
        />
        <TooltipContent side="top">{shapeTooltip}</TooltipContent>
      </Tooltip>
    </>
  )
}
