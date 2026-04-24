/* eslint-disable react/no-unknown-property */
import { useFrame } from "@react-three/fiber"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useRef, useState } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"
import { pointStrictlyInsidePolygon } from "#/lib/polygon-validation"
import { getAllNodesData } from "#/server/graph.functions"
import { getAllRoomsData } from "#/server/room.functions"

import { useCanvasPointer } from "../hooks/use-canvas-pointer"
import { useSnapToExisting } from "../hooks/use-snap-to-existing"

import { DRAWING_LIFT, FLOOR_HEIGHT, SNAP_RADIUS_METERS } from "./constants"
import { VertexMarker } from "./draw-primitives"
import { RaycastPlane } from "./raycast-plane"

import type { FloorPlan } from "#/types/floor-plan"

interface GraphLayerProps {
  floor: FloorPlan
}

const NODE_COLOR = "#3b82f6"
const NODE_INACTIVE_COLOR = "#ef4444"
const NODE_HIGHLIGHT_COLOR = "#f97316"
const CURSOR_COLOR = "#fbbf24"
const SNAP_HALO_COLOR = "#fbbf24"

const NODE_RADIUS = 0.14
const CURSOR_RADIUS = 0.12
const SNAP_HALO_RADIUS = 0.22
const BASE_CAMERA_ZOOM = 60
const DRAG_THRESHOLD_PX = 5

const lift = (v: THREE.Vector3): [number, number, number] => [v.x, v.y + DRAWING_LIFT, v.z]

const snapPointToGrid = (point: THREE.Vector3, spacing: number, floorY: number): THREE.Vector3 =>
  new THREE.Vector3(
    Math.round(point.x / spacing) * spacing,
    floorY,
    Math.round(point.z / spacing) * spacing,
  )

type NodeRecord = Awaited<ReturnType<typeof getAllNodesData>>[number]

/** Clickable, zoom-stable sphere for an existing node. Stops propagation so
 *  the RaycastPlane underneath doesn't also fire and open the create panel. */
const ClickableNode = ({
  node,
  floorY,
  highlighted,
}: {
  node: NodeRecord
  floorY: number
  highlighted: boolean
}) => {
  const { setEditingNodeId, setPendingNode } = useMap()
  const meshRef = useRef<THREE.Mesh>(null)
  const downRef = useRef<{ x: number; y: number } | null>(null)

  useFrame(({ camera }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const zoom = (camera as THREE.OrthographicCamera).zoom
    if (zoom) mesh.scale.setScalar(BASE_CAMERA_ZOOM / zoom)
  })

  return (
    <mesh
      ref={meshRef}
      position={[node.x, floorY + DRAWING_LIFT, -node.y]}
      onPointerDown={(e) => {
        e.stopPropagation()
        downRef.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        const start = downRef.current
        downRef.current = null
        if (!start) return
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD_PX) return
        setPendingNode(null)
        setEditingNodeId(node.id)
      }}
    >
      <sphereGeometry args={[NODE_RADIUS, 32, 32]} />
      <meshBasicMaterial
        color={
          highlighted ? NODE_HIGHLIGHT_COLOR : node.isActivated ? NODE_COLOR : NODE_INACTIVE_COLOR
        }
      />
    </mesh>
  )
}

export const GraphLayer = ({ floor }: GraphLayerProps) => {
  const {
    setPendingNode,
    setEditingNodeId,
    snapToGrid,
    gridSpacingRef,
    pendingNode,
    editingNodeId,
  } = useMap()
  const [cursor, setCursor] = useState<THREE.Vector3 | null>(null)

  const floorY = floor.floor * FLOOR_HEIGHT

  const applyGridSnap = useCallback(
    (point: THREE.Vector3): THREE.Vector3 => {
      if (!snapToGrid) return point
      const spacing = gridSpacingRef.current
      if (!spacing) return point
      return snapPointToGrid(point, spacing, floorY)
    },
    [snapToGrid, gridSpacingRef, floorY],
  )

  const { data: allNodes = [] } = useQuery({
    queryKey: ["nodes"],
    queryFn: getAllNodesData,
  })

  const { data: allRooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: getAllRoomsData,
  })

  const floorNodes = useMemo(
    () => allNodes.filter((n) => n.floor === floor.floor),
    [allNodes, floor.floor],
  )

  const floorRooms = useMemo(
    () => allRooms.filter((r) => r.floor === floor.floor),
    [allRooms, floor.floor],
  )

  const nodePositions = useMemo<THREE.Vector3[]>(
    () => floorNodes.map((n) => new THREE.Vector3(n.x, floorY, -n.y)),
    [floorNodes, floorY],
  )

  const snap = useSnapToExisting(nodePositions, SNAP_RADIUS_METERS)

  const snapTarget = useMemo(() => (cursor ? snap(cursor) : null), [cursor, snap])

  const landingPoint = useMemo(() => {
    if (!cursor) return null
    // eslint-disable-next-line react-hooks/refs
    return snapTarget ?? applyGridSnap(cursor)
  }, [cursor, snapTarget, applyGridSnap])

  const gridSnapHighlight = useMemo<THREE.Vector3 | null>(() => {
    if (!cursor || snapTarget) return null
    // eslint-disable-next-line react-hooks/refs
    const snapped = applyGridSnap(cursor)
    return snapped === cursor ? null : snapped
  }, [cursor, snapTarget, applyGridSnap])

  const handleClick = useCallback(
    (point: THREE.Vector3) => {
      const landed = snap(point) ?? applyGridSnap(point)
      const containingRoom = floorRooms.find((r) => pointStrictlyInsidePolygon(landed, r.vertices))
      setEditingNodeId(null)
      setPendingNode({
        x: landed.x,
        y: -landed.z,
        z: floor.floor,
        floor: floor.floor,
        roomId: containingRoom?.id,
      })
    },
    [snap, applyGridSnap, setPendingNode, setEditingNodeId, floorRooms, floor.floor],
  )

  const handleMove = useCallback((point: THREE.Vector3) => {
    setCursor(point)
  }, [])

  const handlers = useCanvasPointer({ onClick: handleClick, onMove: handleMove })

  return (
    <>
      <RaycastPlane floor={floor} {...handlers} />

      {floorNodes.map((node) => (
        <ClickableNode
          key={node.id}
          node={node}
          floorY={floorY}
          highlighted={node.id === editingNodeId}
        />
      ))}

      {pendingNode?.floor === floor.floor && (
        <VertexMarker
          position={[pendingNode.x, floorY + DRAWING_LIFT, -pendingNode.y]}
          color={NODE_HIGHLIGHT_COLOR}
          radius={NODE_RADIUS}
        />
      )}

      {snapTarget && (
        <VertexMarker
          position={lift(snapTarget)}
          color={SNAP_HALO_COLOR}
          radius={SNAP_HALO_RADIUS}
        />
      )}

      {gridSnapHighlight && (
        <VertexMarker
          position={lift(gridSnapHighlight)}
          color={SNAP_HALO_COLOR}
          radius={CURSOR_RADIUS}
        />
      )}

      {landingPoint && (
        <VertexMarker position={lift(landingPoint)} color={CURSOR_COLOR} radius={CURSOR_RADIUS} />
      )}
    </>
  )
}
