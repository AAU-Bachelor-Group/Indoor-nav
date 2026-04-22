import { useQuery } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"

import { useRoomDrawingState } from "#/components/hooks/use-room-drawing-state"
import { getFloorPlansData } from "#/server/floorplan.functions"
import type { OrbitControls as DreiOrbitControls } from "@react-three/drei"

import type { RoomDrawingState } from "#/components/hooks/use-room-drawing-state"
import type { FloorPlan } from "#/types/floor-plan"
import type { ComponentRef, ReactNode, RefObject } from "react"

export type OrbitControlsHandle = ComponentRef<typeof DreiOrbitControls>

type RenderMode = "2d" | "3d"

/**
 * The currently active map-editing tool, or null if none.
 *
 * Only `draw-room` and `edit-room` are wired in this PBI; the other variants
 * are reserved for the next PBI (node + edge editing) so the union doesn't
 * have to change again.
 */
export type ActiveTool = "draw-room" | "edit-room" | "draw-node" | "connect-edge" | null

interface MapContextValue {
  floors: FloorPlan[]
  currentFloor: number | null
  setCurrentFloor: (floor: number) => void
  isSelectingFloor: boolean
  setIsSelectingFloor: (selecting: boolean) => void
  isLoading: boolean
  renderMode: RenderMode
  setRenderMode: (mode: RenderMode) => void
  activeTool: ActiveTool
  /**
   * Activate or clear an editing tool.
   *
   * Side effects (owned here so callers don't have to remember them):
   * - Activating any tool from null forces `renderMode` to `"2d"` and
   *   remembers the previous mode.
   * - Clearing the tool back to null restores the remembered mode.
   * - Switching between two non-null tools leaves the lock in place.
   * - Switching tools also clears `editingRoomId` so the edit panel
   *   doesn't linger when the user switches into draw mode.
   */
  setActiveTool: (tool: ActiveTool) => void
  /**
   * In-progress room polygon state for the draw-room tool. Auto-resets
   * whenever `activeTool` is not `'draw-room'`.
   */
  drawing: RoomDrawingState
  /**
   * The currently selected room id for the edit-room flow, or null if no
   * room is selected. Only meaningful while `activeTool === 'edit-room'`,
   * but stored on the context so the metadata panel can react.
   */
  editingRoomId: string | null
  setEditingRoomId: (id: string | null) => void
  /**
   * The room currently being viewed in the end-user info drawer, or null.
   * Set when a user clicks a room outside of any editing tool. Mutually
   * exclusive with `editingRoomId` — admin edit flow uses that one instead.
   */
  viewingRoomId: string | null
  setViewingRoomId: (id: string | null) => void
  debugMode: boolean
  setDebugMode: (debug: boolean) => void
  /**
   * When true, drawing tools snap the cursor to the nearest intersection of
   * the adaptive grid (same spacing the user sees). Vertex/corner snap still
   * wins over grid snap.
   */
  snapToGrid: boolean
  setSnapToGrid: (snap: boolean) => void
  /**
   * Current grid spacing in world units, written every frame by the adaptive
   * grid. Ref (not state) so the per-frame writes don't re-render consumers.
   * Null when the grid is not mounted.
   */
  gridSpacingRef: RefObject<number | null>
  /**
   * Ref to the underlying OrbitControls instance. Populated by MapScene after
   * mount; consumers should null-check before using. Exposed so UI outside the
   * Canvas (e.g. the compass) can read rotation and reset it.
   */
  controlsRef: RefObject<OrbitControlsHandle | null>
}

const MapContext = createContext<MapContextValue | null>(null)

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const { data: floors = [], isLoading } = useQuery({
    queryKey: ["floorPlans"],
    queryFn: getFloorPlansData,
  })

  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)

  // Use explicit selection, or default to floor 0 (falling back to the lowest floor)
  const currentFloor =
    selectedFloor !== null && floors.some((f) => f.floor === selectedFloor)
      ? selectedFloor
      : floors.some((f) => f.floor === 0)
        ? 1
        : floors.length > 0
          ? Math.min(...floors.map((f) => f.floor))
          : null

  const [isSelectingFloor, setIsSelectingFloor] = useState(false)
  const [renderMode, setRenderMode] = useState<RenderMode>("2d")

  const [debugMode, setDebugMode] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [viewingRoomId, setViewingRoomId] = useState<string | null>(null)
  const previousRenderModeRef = useRef<RenderMode | null>(null)
  const controlsRef = useRef<OrbitControlsHandle | null>(null)
  const gridSpacingRef = useRef<number | null>(null)

  const drawing = useRoomDrawingState(activeTool === "draw-room", currentFloor)

  const handleSetActiveTool = useCallback(
    (tool: ActiveTool) => {
      setActiveTool((current) => {
        if (current === null && tool !== null) {
          // Activating: remember the current mode and lock to 2D for vertex placement.
          previousRenderModeRef.current = renderMode
          setRenderMode("2d")
        } else if (current !== null && tool === null) {
          // Deactivating: restore the remembered mode (if any).
          const previous = previousRenderModeRef.current
          previousRenderModeRef.current = null
          if (previous !== null) {
            setRenderMode(previous)
          }
        }
        return tool
      })
      // Switching to a different tool clears any in-flight edit selection so
      // the panel doesn't linger when the user moves between draw and edit.
      setEditingRoomId(null)
      setViewingRoomId(null)
    },
    [renderMode],
  )

  const handleSetEditingRoomId = useCallback((id: string | null) => {
    setEditingRoomId(id)
    if (id !== null) setViewingRoomId(null)
  }, [])

  const handleSetViewingRoomId = useCallback((id: string | null) => {
    setViewingRoomId(id)
    if (id !== null) setEditingRoomId(null)
  }, [])

  const value = useMemo<MapContextValue>(
    () => ({
      floors,
      currentFloor,
      setCurrentFloor: setSelectedFloor,
      isSelectingFloor,
      setIsSelectingFloor,
      isLoading,
      renderMode,
      setRenderMode,
      debugMode,
      setDebugMode,
      activeTool,
      setActiveTool: handleSetActiveTool,
      drawing,
      editingRoomId,
      setEditingRoomId: handleSetEditingRoomId,
      viewingRoomId,
      setViewingRoomId: handleSetViewingRoomId,
      snapToGrid,
      setSnapToGrid,
      gridSpacingRef,
      controlsRef,
    }),
    [
      floors,
      currentFloor,
      setSelectedFloor,
      isSelectingFloor,
      setIsSelectingFloor,
      isLoading,
      renderMode,
      setRenderMode,
      debugMode,
      setDebugMode,
      activeTool,
      handleSetActiveTool,
      drawing,
      editingRoomId,
      handleSetEditingRoomId,
      viewingRoomId,
      handleSetViewingRoomId,
      snapToGrid,
    ],
  )

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export const useMap = () => {
  const context = useContext(MapContext)
  if (!context) {
    throw new Error("useMap must be used within a MapProvider")
  }
  return context
}
