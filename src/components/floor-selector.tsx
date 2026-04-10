import { useRef, useEffect, useState } from "react"

import { useMap } from "#/lib/map-context"
import { cn } from "@/lib/utils"

interface FloorSelectorProps {
  className?: string
}

export const FloorSelector = ({ className }: FloorSelectorProps) => {
  const { floors, currentFloor, setCurrentFloor } = useMap()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

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
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none",
        )}
      >
        {floorNumbers.map((floor) => (
          <button
            key={floor}
            onClick={() => {
              setCurrentFloor(floor)
              setIsOpen(false)
            }}
            className={cn(
              "cursor-pointer w-12 h-12 rounded-xl backdrop-blur-sm font-medium text-sm",
              "transition-colors duration-150 flex items-center justify-center",
              "border shadow-lg",
              floor === currentFloor
                ? "bg-secondary text-white border-black hover:bg-secondary/80"
                : "bg-primary text-white border-black hover:bg-primary/80 ",
            )}
          >
            {floor}
          </button>
        ))}
      </div>

      {/* Current floor button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        className={cn(
          "cursor-pointer w-14 h-14 rounded-2xl bg-primary backdrop-blur-sm flex items-center justify-center",
          "transition-all duration-200 shadow-xl border border-slate-700/50",
          "hover:bg-secondary",
          isOpen && "ring-2 ring-primary/50",
        )}
      >
        <span className="text-white font-semibold text-lg">{currentFloor ?? "-"}</span>
      </button>
    </div>
  )
}
