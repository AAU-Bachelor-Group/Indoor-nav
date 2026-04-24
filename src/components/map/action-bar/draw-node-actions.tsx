import { Grid3x3 } from "lucide-react"

import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"
import { useMap } from "#/lib/map-context"

export const DrawNodeActions = () => {
  const { snapToGrid, setSnapToGrid } = useMap()
  const gridTooltip = snapToGrid ? "Disable grid snap" : "Enable grid snap"

  return (
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
  )
}
