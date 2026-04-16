import { useRef, useEffect } from "react"

import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"
import { useMap } from "#/lib/map-context"
import { cn } from "@/lib/utils"

interface FloorSelectorProps {
  className?: string
}

export const FloorSelector = ({ className }: FloorSelectorProps) => {
  const { floors, currentFloor, setCurrentFloor, isSelectingFloor, setIsSelectingFloor } = useMap()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSelectingFloor(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [setIsSelectingFloor])

  const floorNumbers = floors.map((f) => f.floor).sort((a, b) => a - b)

  if (floorNumbers.length === 0) return null

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex z-100 flex-col-reverse items-center", className)}
    >
      {/* Floor options - expands upward */}
      <div
        className={cn(
          "absolute bottom-full mb-2 flex flex-col-reverse gap-1 transition-all duration-200 ease-out",
          isSelectingFloor
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none",
        )}
      >
        {floorNumbers.map((floor) => (
          <Tooltip key={floor}>
            <TooltipTrigger
              render={
                <Button
                  variant="floating"
                  size="icon-xl"
                  type="button"
                  aria-label={`Go to floor ${String(floor)}`}
                  aria-pressed={floor === currentFloor}
                  // Options are visually smaller than the main floor button.
                  className="size-12 rounded-xl font-medium text-sm"
                  onClick={() => {
                    setCurrentFloor(floor)
                    setIsSelectingFloor(false)
                  }}
                >
                  {floor}
                </Button>
              }
            />
            <TooltipContent side="left">Floor {floor}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Current floor button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="floating"
              size="icon-xl"
              type="button"
              aria-label="Change floor"
              aria-pressed={isSelectingFloor}
              onClick={() => {
                setIsSelectingFloor(!isSelectingFloor)
              }}
            >
              <span className="font-semibold text-lg">{currentFloor ?? "-"}</span>
            </Button>
          }
        />
        <TooltipContent side="left">Change floor</TooltipContent>
      </Tooltip>
    </div>
  )
}
