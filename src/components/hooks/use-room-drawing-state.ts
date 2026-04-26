import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"

import { validateInProgressPolygon } from "#/lib/polygon-validation"
import { getAllRoomsData } from "#/server/room.functions"

import type { PolygonObstacle } from "#/lib/polygon-validation"
import type * as THREE from "three"

/**
 * Minimum number of vertices a polygon needs before it can be closed.
 * Anything less is degenerate (a point or a line, not a room).
 */
export const MIN_POLYGON_VERTICES = 3

export interface RoomDrawingState {
  /** Vertices placed so far, in click order. */
  vertices: THREE.Vector3[]
  /** True once the user has explicitly closed the polygon. */
  closed: boolean
  /**
   * Continuous client-side validation message, or null if the in-progress
   * polygon is valid (or simply too short to validate). Recomputed on every
   * vertex change so the user gets instant feedback.
   */
  validationError: string | null
  /** Append a vertex to the in-progress polygon. */
  addVertex: (point: THREE.Vector3) => void
  /** Pop the most recent vertex. No-op if there are none. */
  undo: () => void
  /** Replace all vertices in one shot (used by shape tools). */
  setPolygon: (points: THREE.Vector3[], close?: boolean) => void
  /**
   * Close the polygon if there are at least MIN_POLYGON_VERTICES vertices
   * and the polygon passes client-side validation. No-op otherwise.
   */
  finish: () => void
  /**
   * Clear vertices and the closed flag. Used by the metadata panel after a
   * successful save (so the user can start drawing the next room) or when
   * the user explicitly discards.
   */
  reset: () => void
  /**
   * Set closed = false but keep vertices intact. Used by the metadata panel's
   * Revert action to return to drawing/editing mode without losing geometry.
   */
  reopen: () => void
}

/**
 * Owns the in-progress room polygon for the draw-room tool.
 *
 * Called from inside `MapProvider` and exposed as `useMap().drawing` so all
 * map editing state lives behind a single hook. Cursor position and snap
 * target are deliberately NOT in here — they update on every pointer move
 * and would re-render every consumer of `useMap()`. Those stay as local
 * state inside `<DrawingLayer>`.
 *
 * The state auto-resets whenever the active tool moves away from
 * `'draw-room'`, so callers don't have to remember to clean up.
 */
export const useRoomDrawingState = (
  isDrawingRoom: boolean,
  currentFloor: number | null,
): RoomDrawingState => {
  const [vertices, setVertices] = useState<THREE.Vector3[]>([])
  const [closed, setClosed] = useState(false)

  // Auto-reset when leaving draw-room mode (or any time the tool isn't active).
  useEffect(() => {
    if (!isDrawingRoom) {
      setVertices([])
      setClosed(false)
    }
  }, [isDrawingRoom])

  const addVertex = useCallback((point: THREE.Vector3) => {
    setVertices((prev) => [...prev, point.clone()])
  }, [])

  const undo = useCallback(() => {
    setVertices((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)))
    setClosed(false)
  }, [])

  // Existing rooms on the current floor act as obstacles for client-side
  // overlap validation. The query is shared (deduped) with RoomPolygonsLayer
  // and DrawingLayer so there is only one network round-trip.
  const { data: allRooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
  })

  const obstacles = useMemo<PolygonObstacle[]>(() => {
    if (currentFloor === null) return []
    return allRooms
      .filter((r) => r.floor === currentFloor)
      .map((r) => ({ vertices: r.vertices, label: r.roomNumber }))
  }, [allRooms, currentFloor])

  // Continuous validation: derived from vertices + obstacles. Cheap for
  // hand-drawn polygons against a small number of existing rooms.
  const validationError = useMemo(
    () => validateInProgressPolygon(vertices, obstacles),
    [vertices, obstacles],
  )

  const setPolygon = useCallback(
    (points: THREE.Vector3[], close = false) => {
      const next = points.map((point) => point.clone())
      setVertices(next)
      if (!close) {
        setClosed(false)
        return
      }
      if (next.length < MIN_POLYGON_VERTICES) {
        setClosed(false)
        return
      }
      const invalidReason = validateInProgressPolygon(next, obstacles)
      setClosed(invalidReason === null)
    },
    [obstacles],
  )

  const finish = useCallback(() => {
    if (vertices.length < MIN_POLYGON_VERTICES) return
    if (validationError !== null) return
    setClosed(true)
  }, [vertices, validationError])

  const reset = useCallback(() => {
    setVertices([])
    setClosed(false)
  }, [])

  const reopen = useCallback(() => {
    setClosed(false)
  }, [])

  return useMemo(
    () => ({
      vertices,
      closed,
      validationError,
      addVertex,
      undo,
      setPolygon,
      finish,
      reset,
      reopen,
    }),
    [vertices, closed, validationError, addVertex, undo, setPolygon, finish, reset, reopen],
  )
}
