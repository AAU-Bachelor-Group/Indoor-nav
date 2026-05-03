import { CircleDot } from "lucide-react"

import { useMap } from "#/lib/map-context"

/**
 * Crosshair shown at viewport center while the user is picking a start
 * coordinate on the map. Uses the same `CircleDot` icon as the placed
 * start marker, so the picking and placed states read as the same thing.
 * The accompanying Cancel / Confirm action bar is owned by `<ActionBar />`.
 */
export const MapPickOverlay = () => {
  const { pickingStart } = useMap()

  if (!pickingStart) return null

  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
      <CircleDot className="size-9 text-blue-700 drop-shadow-lg" strokeWidth={2.5} />
    </div>
  )
}
