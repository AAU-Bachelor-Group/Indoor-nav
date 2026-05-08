import { Html } from "@react-three/drei"
import { useQuery } from "@tanstack/react-query"
import { CircleDot, MapPin } from "lucide-react"
import { useMemo } from "react"

import { useMap } from "#/lib/map-context"
import { useNavigation } from "#/lib/navigation-context"
import { floorToY, mapPointToThree, polygonCentroid } from "#/lib/three-utils"
import { getAllRoomsData } from "#/server/room.functions"

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
  const { start, destination, navigationPath } = useNavigation()
  const { renderMode, currentFloor, editingRoomId, viewingRoomId } = useMap()

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
  })

  const highlightedRoom = useMemo(() => {
    const highlightedId = editingRoomId || viewingRoomId
    return highlightedId ? rooms.find((room) => room.id === highlightedId) : null
  }, [rooms, editingRoomId, viewingRoomId])

  const startPlacement = useMemo(() => {
    if (!start) return null
    if (navigationPath && navigationPath.length > 0) {
      const firstNode = navigationPath[0]
      return { position: mapPointToThree(firstNode, MARKER_LIFT), floor: firstNode.floor }
    }
    return navigationValueToPlacement(start)
  }, [start, navigationPath])

  const destinationPlacement = useMemo(() => {
    if (!destination) return null
    if (navigationPath && navigationPath.length > 0) {
      const lastNode = navigationPath[navigationPath.length - 1]
      return { position: mapPointToThree(lastNode, MARKER_LIFT), floor: lastNode.floor }
    }
    return navigationValueToPlacement(destination)
  }, [destination, navigationPath])

  const highlightedRoomPlacement = useMemo(() => {
    if (!highlightedRoom) return null
    return navigationValueToPlacement(highlightedRoom)
  }, [highlightedRoom])

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

      {highlightedRoomPlacement &&
        isVisibleOnCurrentView(highlightedRoomPlacement) &&
        !destination && (
          <Html
            position={highlightedRoomPlacement.position}
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
