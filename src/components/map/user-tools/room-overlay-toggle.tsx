import { Eye, EyeOff } from "lucide-react"

import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"
import { useMap } from "#/lib/map-context"

interface RoomOverlayToggleProps {
  className?: string
}

export const RoomOverlayToggle = ({ className }: RoomOverlayToggleProps) => {
  const { roomOverlayMode, setRoomOverlayMode, isSelectingFloor } = useMap()
  const isHidden = roomOverlayMode === "none"

  if (isSelectingFloor) return null

  const tooltipLabel = isHidden ? "Show room icons" : "Hide room overlays"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="floating"
            size="icon-xl"
            type="button"
            aria-pressed={!isHidden}
            aria-label={tooltipLabel}
            className={className}
            onClick={() => {
              setRoomOverlayMode(isHidden ? "icon" : "none")
            }}
          >
            {isHidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </Button>
        }
      />
      <TooltipContent side="left">{tooltipLabel}</TooltipContent>
    </Tooltip>
  )
}
