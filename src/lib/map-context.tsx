import { useQuery } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"

import { useRoomDrawingState } from "#/components/hooks/use-room-drawing-state"
import { polygonCentroid } from "#/lib/three-utils"
import { getFloorPlansData } from "#/server/floorplan.functions"
import type { OrbitControls as DreiOrbitControls } from "@react-three/drei"

import type { RoomDrawingState } from "#/components/hooks/use-room-drawing-state"
import type { FloorPlan } from "#/types/floor-plan"
import type { Node, PendingNode } from "#/types/node"
import type { Room } from "#/types/room"
import type { ComponentRef, ReactNode, RefObject } from "react"

type OrbitControlsHandle = ComponentRef<typeof DreiOrbitControls>

type RenderMode = "2d" | "3d"
type RoomDrawMode = "polygon" | "rectangle"
type RoomOverlayMode = "icon" | "none"

/**
 * The currently active map-editing tool, or null if none.
 *
 * Only `draw-room` and `edit-room` are wired in this PBI; the other variants
 * are reserved for the next PBI (node + edge editing) so the union doesn't
 * have to change again.
 */
export type ActiveTool = "default" | "draw-room" | "edit-room" | "draw-node" | "connect-edge"

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
  editingNodeId: string | null
  setEditingNodeId: (id: string | null) => void
  pendingNode: PendingNode | null
  setPendingNode: (node: PendingNode | null) => void
  /** The first node selected in connect-edge mode, awaiting a second click. */
  pendingEdgeFromNodeId: string | null
  setPendingEdgeFromNodeId: (id: string | null) => void
  /** The edge currently selected for viewing/deletion in connect-edge mode. */
  editingEdgeId: string | null
  setEditingEdgeId: (id: string | null) => void
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
  roomDrawMode: RoomDrawMode
  setRoomDrawMode: (mode: RoomDrawMode) => void
  roomOverlayMode: RoomOverlayMode
  setRoomOverlayMode: (mode: RoomOverlayMode) => void
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
  /**
   * When true, an end-user is picking a coordinate on the map (entered from
   * the navigation panel's "Select on map" result). The map-pick overlay
   * renders a centered crosshair and a confirm/cancel toolbar.
   */
  pickingStart: boolean
  setPickingStart: (picking: boolean) => void
  /**
   * Per-frame focus animator (read by `<FocusRig>`). Holds the active
   * request, or null when nothing is in flight. Use `focusTarget()` to set.
   */
  focusRequestRef: RefObject<FocusRequest | null>
  /**
   * Smoothly pan the camera to a Room, Node, or free-form floor coordinate,
   * switching to the right floor as a side effect. Latest call wins.
   *
   * Rooms get a fit-to-bbox zoom; nodes/points get a fixed close-up zoom.
   */
  focusTarget: (target: Room | Node | { x: number; y: number; floor: number }) => void
}

/**
 * Animation request consumed by `<FocusRig>`. World coords are three.js
 * (x, _, z) — `worldZ = -mapY` for points expressed in map coordinates.
 *
 * `targetSpan` is the world distance the focus should fit on the smaller
 * viewport axis. The actual zoom (ortho) or distance (perspective) is
 * computed from the live camera frustum inside `FocusRig`, since both
 * depend on canvas size and FOV which `focusTarget` doesn't know about.
 */
export interface FocusRequest {
  worldX: number
  worldZ: number
  targetSpan?: number
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
  const [roomDrawMode, setRoomDrawMode] = useState<RoomDrawMode>("polygon")
  const [roomOverlayMode, setRoomOverlayMode] = useState<RoomOverlayMode>("icon")
  const [activeTool, setActiveTool] = useState<ActiveTool>("default")
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [viewingRoomId, setViewingRoomId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [pendingNode, setPendingNode] = useState<PendingNode | null>(null)
  const [pendingEdgeFromNodeId, setPendingEdgeFromNodeId] = useState<string | null>(null)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [pickingStart, setPickingStart] = useState(false)
  const previousRenderModeRef = useRef<RenderMode | null>(null)
  const previousRenderModeForPickRef = useRef<RenderMode | null>(null)
  const controlsRef = useRef<OrbitControlsHandle | null>(null)
  const gridSpacingRef = useRef<number | null>(null)
  const focusRequestRef = useRef<FocusRequest | null>(null)

  const drawing = useRoomDrawingState(activeTool === "draw-room", currentFloor)

  const handleSetActiveTool = useCallback(
    (tool: ActiveTool) => {
      setActiveTool((current) => {
        if (current === "default" && tool !== "default") {
          // Activating: remember the current mode and lock to 2D for vertex placement.
          previousRenderModeRef.current = renderMode
          setRenderMode("2d")
        } else if (current !== "default" && tool === "default") {
          // Returning to the default view: restore the remembered mode.
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
      setEditingNodeId(null)
      setPendingNode(null)
      setPendingEdgeFromNodeId(null)
      setEditingEdgeId(null)
    },
    [renderMode],
  )

  const handleSetPickingStart = useCallback(
    (picking: boolean) => {
      setPickingStart((current) => {
        if (!current && picking) {
          // Picking only resolves correctly in 2D top-down. Lock the render
          // mode and remember the previous one to restore on exit.
          previousRenderModeForPickRef.current = renderMode
          setRenderMode("2d")
        } else if (current && !picking) {
          const previous = previousRenderModeForPickRef.current
          previousRenderModeForPickRef.current = null
          if (previous !== null) setRenderMode(previous)
        }
        return picking
      })
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

  const focusTarget = useCallback<MapContextValue["focusTarget"]>((target) => {
    setSelectedFloor(target.floor)

    if ("vertices" in target) {
      const c = polygonCentroid(target.vertices)
      // Bounding box of the polygon (in floor-plane (x, z) coords).
      let minX = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let minZ = Number.POSITIVE_INFINITY
      let maxZ = Number.NEGATIVE_INFINITY
      for (const v of target.vertices) {
        if (v.x < minX) minX = v.x
        if (v.x > maxX) maxX = v.x
        if (v.z < minZ) minZ = v.z
        if (v.z > maxZ) maxZ = v.z
      }
      // World-units to fit on the smaller viewport axis. 1.6× pad on the
      // longest side keeps the room comfortably framed instead of edge-to-
      // edge. FocusRig converts this to the right zoom (ortho) or distance
      // (perspective) using the camera's actual frustum.
      const longest = Math.max(maxX - minX, maxZ - minZ, 1)
      focusRequestRef.current = { worldX: c.x, worldZ: c.z, targetSpan: longest * 1.6 }
      return
    }

    // Node or free-form point — both expose (x, y, floor) in map coords;
    // map y → world -z. ~8m around the point is a sensible close-up.
    focusRequestRef.current = {
      worldX: target.x,
      worldZ: -target.y,
      targetSpan: 8,
    }
  }, [])

  const handleSetEditingNodeId = useCallback((id: string | null) => {
    setEditingNodeId(id)
    if (id !== null) {
      setPendingNode(null)
      setEditingRoomId(null)
      setViewingRoomId(null)
    }
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
      roomDrawMode,
      setRoomDrawMode,
      roomOverlayMode,
      setRoomOverlayMode,
      gridSpacingRef,
      controlsRef,
      editingNodeId,
      setEditingNodeId: handleSetEditingNodeId,
      pendingNode,
      setPendingNode,
      pendingEdgeFromNodeId,
      setPendingEdgeFromNodeId,
      editingEdgeId,
      setEditingEdgeId,
      pickingStart,
      setPickingStart: handleSetPickingStart,
      focusRequestRef,
      focusTarget,
    }),
    [
      floors,
      currentFloor,
      isSelectingFloor,
      isLoading,
      renderMode,
      debugMode,
      activeTool,
      handleSetActiveTool,
      drawing,
      editingRoomId,
      handleSetEditingRoomId,
      viewingRoomId,
      handleSetViewingRoomId,
      snapToGrid,
      roomDrawMode,
      roomOverlayMode,
      editingNodeId,
      handleSetEditingNodeId,
      pendingNode,
      pendingEdgeFromNodeId,
      editingEdgeId,
      pickingStart,
      handleSetPickingStart,
      focusTarget,
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
