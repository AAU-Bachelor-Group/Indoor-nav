import { Layers } from "lucide-react"

import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"
import { useMap } from "#/lib/map-context"

export const ConnectEdgeActions = () => {
  const { connectEdgeMode, setConnectEdgeMode, setPendingEdgeFromNodeId } = useMap()
  const isCrossFloor = connectEdgeMode === "cross-floor"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="toolbar"
            size="icon-round"
            type="button"
            onClick={() => {
              setPendingEdgeFromNodeId(null)
              setConnectEdgeMode(isCrossFloor ? "same-floor" : "cross-floor")
            }}
            aria-pressed={isCrossFloor}
            aria-label={
              isCrossFloor ? "Switch to same-floor edges" : "Connect nodes between floors"
            }
          >
            <Layers className="size-5" />
          </Button>
        }
      />
      <TooltipContent side="top">
        {isCrossFloor ? "Same-floor mode" : "Connect between floors"}
      </TooltipContent>
    </Tooltip>
  )
}
