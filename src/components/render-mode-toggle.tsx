import { useMap } from "#/lib/map-context"
import { cn } from "@/lib/utils"

interface RenderModeToggleProps {
  className?: string
}

export const RenderModeToggle = ({ className }: RenderModeToggleProps) => {
  const { renderMode, setRenderMode } = useMap()

  return (
    <button
      className={cn(
        "w-14 h-14 rounded-2xl bg-slate-800/95 backdrop-blur-sm flex items-center justify-center",
        "transition-all duration-200 shadow-xl border border-slate-700/50",
        "hover:bg-slate-700",
        renderMode === "3d" && "ring-2 ring-blue-500/50",
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
