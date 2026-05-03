import { Html } from "@react-three/drei"
import { CircleDot, MapPin } from "lucide-react"
import { useMemo } from "react"

import { useMap } from "#/lib/map-context"
import { useNavigation } from "#/lib/navigation-context"
import { floorToY, mapPointToThree, polygonCentroid } from "#/lib/three-utils"

import { MARKER_LIFT } from "./constants"

import type { NavigationStart } from "#/types/navigation"
import type { Room } from "#/types/room"

interface MarkerPlacement {
  position: [number, number, number]
  floor: number
}

/**
 * Convert a navigation value into a three.js position + the floor it lives
 * on (so the caller can decide whether to render it under the current view).
 *
 * - **Room**: centroid of the polygon vertices (already in `(x, z)` floor
 *   axes), lifted to the room's floor.
 * - **Node** / **map-picked point**: standard map → three conversion
 *   (`-y` → three.z), lifted to the floor.
 */
const navigationValueToPlacement = (value: NavigationStart | Room): MarkerPlacement => {
  if ("roomNumber" in value) {
    const c = polygonCentroid(value.vertices)
    return { position: [c.x, floorToY(value.floor, MARKER_LIFT), c.z], floor: value.floor }
  }
  return { position: mapPointToThree(value, MARKER_LIFT), floor: value.floor }
}

/**
 * Always-on visual cues for the active navigation request. Both markers
 * render as lucide icons via drei `<Html>` overlays so they share the same
 * renderer (matching room icons) and react identically to camera zoom.
 *
 * - Start: blue `CircleDot` centered on the picked coordinate / chosen
 *   room centroid.
 * - Destination: red `MapPin` anchored with its tip on the destination
 *   room centroid.
 *
 * In 3D mode both markers render regardless of which floor the camera is
 * focused on (the floor stacking makes them visible). In 2D top-down mode
 * a marker is only rendered when its floor matches `currentFloor`, so the
 * marker doesn't project onto an unrelated floor's plan.
 */
export const NavigationMarkers = () => {
  const { start, destination } = useNavigation()
  const { renderMode, currentFloor } = useMap()

  const startPlacement = useMemo(() => (start ? navigationValueToPlacement(start) : null), [start])
  const destinationPlacement = useMemo(
    () => (destination ? navigationValueToPlacement(destination) : null),
    [destination],
  )

  const isVisibleOnCurrentView = (placement: MarkerPlacement) =>
    renderMode === "3d" || placement.floor === currentFloor

  return (
    <>
      {startPlacement && isVisibleOnCurrentView(startPlacement) && (
        <Html position={startPlacement.position} center zIndexRange={[0, 0]} pointerEvents="none">
          <CircleDot className="size-9 text-blue-500 drop-shadow-lg" strokeWidth={2.5} />
        </Html>
      )}
      {destinationPlacement && isVisibleOnCurrentView(destinationPlacement) && (
        <Html
          position={destinationPlacement.position}
          center
          zIndexRange={[0, 0]}
          pointerEvents="none"
        >
          <MapPin
            className="size-9 -translate-y-1/2 text-red-500 drop-shadow-lg"
            strokeWidth={2.5}
          />
        </Html>
      )}
    </>
  )
}
