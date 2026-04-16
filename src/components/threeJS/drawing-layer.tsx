import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import * as THREE from "three"

import { MIN_POLYGON_VERTICES } from "#/components/hooks/use-room-drawing-state"
import { useMap } from "#/lib/map-context"
import { getAllRoomsData } from "#/server/room.functions"

import { useCanvasPointer } from "../hooks/use-canvas-pointer"
import { useSnapToExisting } from "../hooks/use-snap-to-existing"

import { DRAWING_LIFT, FLOOR_HEIGHT, SNAP_RADIUS_METERS } from "./constants"
import { EdgePreview, VertexMarker } from "./draw-primitives"
import { RaycastPlane } from "./raycast-plane"

import type { FloorPlan } from "#/types/floor-plan"

interface DrawingLayerProps {
  floor: FloorPlan
}

/**
 * Drawing colors are picked to contrast with the typical (mostly white)
 * architectural floor plan rasters. White-on-white was invisible.
 */
const VERTEX_COLOR = "#FF0000"
const PREVIEW_COLOR = "#7CFC00"
const INVALID_COLOR = "#dc2626" // red — used when the polygon fails validation
const SNAP_COLOR = "#fbbf24" // amber, deliberately distinct from vertex/line colors
const EXTERNAL_CORNER_COLOR = "#0284c7" // cyan — neighbour-room corners, snap-able
const VERTEX_RADIUS = 0.12
const EXTERNAL_CORNER_RADIUS = 0.09
const CLOSE_TARGET_RADIUS = 0.18
const POLYLINE_WIDTH = 4
const PREVIEW_WIDTH = 3

/** Lift a world-space point above the floor plane to avoid z-fighting. */
const lift = (v: THREE.Vector3): [number, number, number] => [v.x, v.y + DRAWING_LIFT, v.z]

/**
 * Position equality on the floor's local 2D plane (x, z). Used instead of
 * reference identity because vertices stored in the drawing state are
 * clones, so two Vector3 instances at the same coordinates are not `===`.
 */
const samePosition = (a: THREE.Vector3, b: THREE.Vector3): boolean => a.x === b.x && a.z === b.z

/**
 * Renders the in-progress room polygon for the active floor and wires
 * pointer interactions on top of a `<RaycastPlane>`.
 *
 * Only mounted while `activeTool === 'draw-room'`. Vertices and the closed
 * flag live in `useMap().drawing`; cursor and snap target are local state
 * here so high-frequency pointer-move updates don't propagate re-renders
 * to other context consumers.
 *
 * Existing-room corners on the same floor are rendered as small cyan dots
 * and added to the snap target list, so adjacent rooms can share walls by
 * placing new vertices exactly at the existing corners.
 */
/** Snap a world point to the nearest intersection of a grid with given spacing. */
const snapPointToGrid = (point: THREE.Vector3, spacing: number, floorY: number): THREE.Vector3 =>
  new THREE.Vector3(
    Math.round(point.x / spacing) * spacing,
    floorY,
    Math.round(point.z / spacing) * spacing,
  )

export const DrawingLayer = ({ floor }: DrawingLayerProps) => {
  const { drawing, snapToGrid, gridSpacingRef } = useMap()
  const { vertices, closed, validationError, addVertex, finish } = drawing

  const [cursor, setCursor] = useState<THREE.Vector3 | null>(null)

  const floorY = floor.floor * FLOOR_HEIGHT

  /**
   * Apply grid snap if enabled AND the grid has a known spacing. Returns the
   * input unchanged otherwise, so callers can use it unconditionally.
   */
  const applyGridSnap = useCallback(
    (point: THREE.Vector3): THREE.Vector3 => {
      if (!snapToGrid) return point
      const spacing = gridSpacingRef.current
      if (!spacing) return point
      return snapPointToGrid(point, spacing, floorY)
    },
    [snapToGrid, gridSpacingRef, floorY],
  )

  // Existing rooms on this floor — same React Query key as RoomPolygonsLayer,
  // so the request is deduped.
  const { data: allRooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
  })

  // Build stable Vector3 instances per render cycle for the existing-room
  // corners. Identity is used downstream by the snap function to distinguish
  // these from the close target, so we memoize on the room data.
  const externalCorners = useMemo<THREE.Vector3[]>(
    () =>
      allRooms
        .filter((r) => r.floor === floor.floor)
        .flatMap((r) => r.vertices.map((v) => new THREE.Vector3(v.x, floorY, v.z))),
    [allRooms, floor.floor, floorY],
  )

  // True once the polygon is closeable: enough vertices placed AND no
  // validation errors. Drives both the click handler and the always-on
  // close-target indicator.
  const canClose = vertices.length >= MIN_POLYGON_VERTICES && !closed && validationError === null

  // Snap targets: the in-progress polygon's first vertex (when closing is
  // valid) PLUS every existing-room corner on this floor.
  const snapTargets = useMemo<THREE.Vector3[]>(() => {
    const targets = [...externalCorners]
    if (canClose) targets.push(vertices[0])
    return targets
  }, [externalCorners, canClose, vertices])

  const snap = useSnapToExisting(snapTargets, SNAP_RADIUS_METERS)
  // Stop computing the snap target once closed — otherwise the cursor still
  // produces a snap result and the highlight stays stuck after closure.
  const snapTarget = useMemo(
    () => (closed || !cursor ? null : snap(cursor)),
    [closed, cursor, snap],
  )

  const handleClick = useCallback(
    (point: THREE.Vector3) => {
      if (closed) return
      const snapped = snap(point)
      if (snapped) {
        // Compare by POSITION rather than reference identity. When the user
        // has previously snapped vertices[0] to an existing corner, the
        // stored vertices[0] is a clone of that corner — both sit at the
        // same coordinates. The snap function may return either reference,
        // and reference identity would falsely fail the close check.
        if (canClose && samePosition(snapped, vertices[0])) {
          finish()
          return
        }
        // External corner snap: place a vertex exactly at the snapped position
        // so the new room shares that corner with the neighbour.
        addVertex(snapped)
        return
      }
      // Grid snap is a fallback: vertex/corner snap always wins so users
      // can still share edges with existing rooms even when grid snap is on.
      addVertex(applyGridSnap(point))
    },
    [closed, snap, canClose, vertices, addVertex, finish, applyGridSnap],
  )

  const handleMove = useCallback((point: THREE.Vector3) => {
    setCursor(point)
  }, [])

  const handlers = useCanvasPointer({
    onClick: handleClick,
    onMove: handleMove,
    enabled: !closed,
  })

  const polylinePoints = useMemo<[number, number, number][]>(() => vertices.map(lift), [vertices])

  // Cursor preview: segment from the last placed vertex to the cursor (or to
  // the snap target if one is in range, or to the grid-snapped cursor when
  // grid snap is on). Mirrors the click-time precedence. applyGridSnap reads
  // gridSpacingRef.current at call time, which is fine here because the preview
  // only needs to reflect the current spacing on the next cursor move (and
  // cursor moves already trigger a re-render).
  const previewPoints = useMemo<[number, number, number][] | null>(() => {
    if (closed || vertices.length === 0 || !cursor) return null
    const lastVertex = vertices[vertices.length - 1]
    // eslint-disable-next-line react-hooks/refs
    const tip = snapTarget ?? applyGridSnap(cursor)
    return [lift(lastVertex), lift(tip)]
  }, [closed, vertices, cursor, snapTarget, applyGridSnap])

  // Polygon outline turns red while validation is failing so the user can
  // see exactly which configuration is invalid before attempting to close.
  const polylineColor = validationError === null ? PREVIEW_COLOR : INVALID_COLOR

  // The cursor-proximity halo only renders when the snap target is an
  // external corner. The close target already has its own always-on halo.
  // Compare by position (not reference) so a corner clone is recognized.
  const cursorOnCloseTarget =
    snapTarget !== null && vertices.length > 0 && samePosition(snapTarget, vertices[0])
  const cursorSnapHighlight = snapTarget && !cursorOnCloseTarget ? snapTarget : null

  // Grid-snap indicator: if the cursor is about to drop on a grid intersection
  // (because grid snap is on and no vertex/corner snap is in range), show a
  // halo there. This makes the initial vertex placement and subsequent hops
  // feel the same as vertex snap — the user always knows where the click lands.
  const gridSnapHighlight = useMemo<THREE.Vector3 | null>(() => {
    if (closed || !cursor || snapTarget) return null
    // eslint-disable-next-line react-hooks/refs
    const snapped = applyGridSnap(cursor)
    return snapped === cursor ? null : snapped
  }, [closed, cursor, snapTarget, applyGridSnap])

  return (
    <>
      <RaycastPlane floor={floor} {...handlers} />

      {externalCorners.map((corner) => (
        <VertexMarker
          key={String(corner.x) + "-" + String(corner.z)}
          position={lift(corner)}
          color={EXTERNAL_CORNER_COLOR}
          radius={EXTERNAL_CORNER_RADIUS}
        />
      ))}

      {polylinePoints.length >= 2 && (
        <EdgePreview
          points={polylinePoints}
          color={polylineColor}
          lineWidth={POLYLINE_WIDTH}
          closed={closed}
        />
      )}

      {previewPoints && (
        <EdgePreview points={previewPoints} color={polylineColor} lineWidth={PREVIEW_WIDTH} />
      )}

      {vertices.map((v) => (
        <VertexMarker
          key={String(v.x) + "-" + String(v.y) + "-" + String(v.z)}
          position={lift(v)}
          color={validationError === null ? VERTEX_COLOR : INVALID_COLOR}
          radius={VERTEX_RADIUS}
        />
      ))}

      {/*
        Always-on close target: a yellow halo on vertices[0] whenever
        closing is valid. Discoverable from the moment a third vertex is
        placed, instead of only when the cursor happens to be near it.
      */}
      {canClose && (
        <VertexMarker
          position={lift(vertices[0])}
          color={SNAP_COLOR}
          radius={CLOSE_TARGET_RADIUS}
        />
      )}

      {/*
        Cursor-proximity halo for an external corner snap. The close target
        already has its own permanent halo so we suppress this one in that
        case to avoid double rendering.
      */}
      {cursorSnapHighlight && (
        <VertexMarker
          position={lift(cursorSnapHighlight)}
          color={SNAP_COLOR}
          radius={CLOSE_TARGET_RADIUS}
        />
      )}

      {/*
        Grid-snap indicator. Same amber halo as vertex snap so the UX feels
        uniform — if you see the halo, that's where the click will land.
      */}
      {gridSnapHighlight && (
        <VertexMarker
          position={lift(gridSnapHighlight)}
          color={SNAP_COLOR}
          radius={CLOSE_TARGET_RADIUS}
        />
      )}
    </>
  )
}
