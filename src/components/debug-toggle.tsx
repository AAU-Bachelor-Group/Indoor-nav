import { useMap } from "#/lib/map-context"
import { cn } from "@/lib/utils"

interface DebugToggleProps {
  className?: string
}

export const DebugToggle = ({ className }: DebugToggleProps) => {
  const { debugMode, setDebugMode, renderMode } = useMap()

  const isDisabled = renderMode === "3d"

  return (
    <button
      className={cn(
        "w-14 h-14 rounded-2xl backdrop-blur-sm flex items-center justify-center",
        "transition-all duration-200 shadow-xl border border-slate-700/50",
        isDisabled
          ? "cursor-not-allowed bg-gray-600 opacity-50"
          : "cursor-pointer bg-primary hover:bg-secondary",
        debugMode && !isDisabled && "ring-2 ring-red-400",
        className,
      )}
      onClick={() => {
        if (!isDisabled) {
          setDebugMode(!debugMode)
        }
      }}
      disabled={isDisabled}
    >
      <span className="text-white font-semibold text-xs text-center">
        {isDisabled ? "Debug\n(2D only)" : debugMode ? "Debug: ON" : "Debug: OFF"}
      </span>
    </button>
  )
}
