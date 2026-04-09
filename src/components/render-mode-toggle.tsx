import { useMap } from "#/lib/map-context"
import { cn } from "@/lib/utils"

interface RenderModeToggleProps {
  className?: string
}

export const RenderModeToggle = ({ className }: RenderModeToggleProps) => {
  const { renderMode, setRenderMode, activeTool } = useMap()
  const locked = activeTool !== null

  return (
    <button
      type="button"
      disabled={locked}
      title={locked ? "Locked to 2D while a draw tool is active" : undefined}
      className={cn(
        "w-14 h-14 rounded-2xl cursor-pointer bg-primary backdrop-blur-sm flex items-center justify-center",
        "transition-all duration-200 shadow-xl border border-slate-700/50",
        "hover:bg-secondary",
        renderMode === "3d" && "ring-2 ring-secondary",
        locked && "opacity-50 cursor-not-allowed hover:bg-primary",
        className,
      )}
      onClick={() => {
        setRenderMode(renderMode === "2d" ? "3d" : "2d")
      }}
    >
      <span className="text-white font-semibold text-sm">{renderMode === "2d" ? "2D" : "3D"}</span>
    </button>
  )
}
