import { createContext, useCallback, useContext, useMemo, useState } from "react"

import { useMap } from "#/lib/map-context"
import { polygonCentroid } from "#/lib/three-utils"

import type { NavigationStart, RoutePreference } from "#/types/navigation"
import type { Node } from "#/types/node"
import type { Room } from "#/types/room"

/** Which navigation panel field the user is currently editing. */
export type FieldKey = "start" | "destination"

/**
 * The runtime navigation request. The wire shape sent to the A* server
 * (`AstarInput`) is structurally similar but requires a destination with
 * its `nodes` relation included; we resolve that at call time.
 */
interface NavigationRequest {
  preference: RoutePreference
  start: NavigationStart
  destination: Room
}

interface NavigationContextValue {
  start: NavigationRequest["start"] | null
  destination: NavigationRequest["destination"] | null
  preference: NavigationRequest["preference"]
  navigationPanelOpen: boolean
  /**
   * Which field the user is currently editing in the navigation panel.
   * Lifted into the context so the map (room polygons, future click
   * handlers) can populate the active field on a single click.
   */
  activeField: FieldKey | null
  navigationPath?: Node[]
  setStart: (start: NavigationRequest["start"] | null) => void
  setDestination: (destination: NavigationRequest["destination"] | null) => void
  setPreference: (preference: NavigationRequest["preference"]) => void
  setNavigationPanelOpen: (open: boolean) => void
  setActiveField: (field: FieldKey | null) => void
  /**
   * Populate the currently-active field with a room the user clicked on the
   * map. Start fields drop a pin at the room's centroid (start must be a
   * point or a node — see `NavigationStart`); destination fields take the
   * room directly. Clears `activeField` afterwards.
   */
  pickRoomForActiveField: (room: Room) => void
  setNavigationPath?: (path: Node[] | undefined) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

/**
 * Drop a pin at a room's centroid. `Room.vertices` use three.js floor-plane
 * axes `(x, z)`; map coords use `(x, y)` where `y = -z`, so the conversion
 * flips the forward axis.
 */
const roomToStartPoint = (room: Room) => {
  const c = polygonCentroid(room.vertices)
  return { x: c.x, y: -c.z, floor: room.floor }
}

export const NavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const { focusTarget } = useMap()
  const [start, setStart] = useState<NavigationRequest["start"] | null>(null)
  const [destination, setDestination] = useState<NavigationRequest["destination"] | null>(null)
  const [preference, setPreference] = useState<NavigationRequest["preference"]>("SIMPLE")
  const [navigationPanelOpen, setNavigationPanelOpen] = useState<boolean>(false)
  const [activeField, setActiveField] = useState<FieldKey | null>(null)
  const [navigationPath, setNavigationPath] = useState<Node[] | undefined>(undefined)

  // Wrap setStart / setDestination so every assignment also pans the map to
  // the chosen target. Covers all entry points: search bar, map click,
  // QR deep-link, future fuzzy-pick, etc.
  const handleSetStart = useCallback(
    (value: NavigationRequest["start"] | null) => {
      setStart(value)
      if (value) focusTarget(value)
    },
    [focusTarget],
  )

  const handleSetDestination = useCallback(
    (value: NavigationRequest["destination"] | null) => {
      setDestination(value)
      if (value) focusTarget(value)
    },
    [focusTarget],
  )

  const pickRoomForActiveField = useCallback(
    (room: Room) => {
      if (!activeField) return
      if (activeField === "start") handleSetStart(roomToStartPoint(room))
      else handleSetDestination(room)
      setActiveField(null)
    },
    [activeField, handleSetStart, handleSetDestination],
  )

  const value = useMemo(
    () => ({
      start,
      destination,
      preference,
      navigationPanelOpen,
      activeField,
      navigationPath,
      setStart: handleSetStart,
      setDestination: handleSetDestination,
      setPreference,
      setNavigationPanelOpen,
      setActiveField,
      pickRoomForActiveField,
      setNavigationPath,
    }),
    [
      start,
      destination,
      preference,
      navigationPanelOpen,
      activeField,
      navigationPath,
      handleSetStart,
      handleSetDestination,
      pickRoomForActiveField,
    ],
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider")
  }
  return context
}
