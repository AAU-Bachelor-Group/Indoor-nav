import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"
import { useMap } from "#/lib/map-context"

interface RenderModeToggleProps {
  className?: string
}

export const RenderModeToggle = ({ className }: RenderModeToggleProps) => {
  const { renderMode, setRenderMode, activeTool, connectEdgeMode, isSelectingFloor } = useMap()
  const locked =
    activeTool !== "default" &&
    !(activeTool === "connect-edge" && connectEdgeMode === "cross-floor")

  if (isSelectingFloor) return null

  const tooltipLabel = locked
    ? "Locked to 2D while editing"
    : renderMode === "2d"
      ? "Switch to 3D"
      : "Switch to 2D"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="floating"
            size="icon-xl"
            type="button"
            disabled={locked}
            aria-pressed={renderMode === "3d"}
            aria-label={tooltipLabel}
            className={className}
            onClick={() => {
              setRenderMode(renderMode === "2d" ? "3d" : "2d")
            }}
          >
            <span className="font-semibold text-sm">{renderMode === "2d" ? "2D" : "3D"}</span>
          </Button>
        }
      />
      <TooltipContent side="left">{tooltipLabel}</TooltipContent>
    </Tooltip>
  )
}
