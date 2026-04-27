/* eslint-disable react/no-unknown-property */
import { useFrame } from "@react-three/fiber"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"
import { addEdgeData, getAllEdgesData, getAllNodesData } from "#/server/graph.functions"

import { useCanvasPointer } from "../hooks/use-canvas-pointer"

import { DRAWING_LIFT, FLOOR_HEIGHT } from "./constants"
import { EdgePreview, VertexMarker } from "./draw-primitives"
import { RaycastPlane } from "./raycast-plane"

import type { FloorPlan } from "#/types/floor-plan"

interface ConnectFloorEdgeLayerProps {
  floor: FloorPlan
}

const NODE_STAIR_COLOR = "#f59e0b"
const NODE_ELEVATOR_COLOR = "#8b5cf6"
const NODE_INACTIVE_COLOR = "#ef4444"
const NODE_SOURCE_COLOR = "#22c55e"
const NODE_HIGHLIGHT_COLOR = "#f97316"
const NODE_DIM_COLOR = "#6b7280"

const EDGE_COLOR = "#a78bfa"
const EDGE_INACTIVE_COLOR = "#ef4444"
const EDGE_SELECTED_COLOR = "#f97316"

const NODE_RADIUS = 0.14
const BASE_CAMERA_ZOOM = 60
const DRAG_THRESHOLD_PX = 5
const FLOOR_DISTANCE_BONUS = 3.25

type NodeRecord = Awaited<ReturnType<typeof getAllNodesData>>[number]
type EdgeRecord = Awaited<ReturnType<typeof getAllEdgesData>>[number]

const ClickableCrossFloorEdge = ({
  edge,
  fromNode,
  toNode,
  isSelected,
}: {
  edge: EdgeRecord
  fromNode: NodeRecord
  toNode: NodeRecord
  isSelected: boolean
}) => {
  const { setEditingEdgeId, setPendingEdgeFromNodeId } = useMap()
  const downRef = useRef<{ x: number; y: number } | null>(null)

  const from3D = useMemo(
    () => new THREE.Vector3(fromNode.x, fromNode.floor * FLOOR_HEIGHT + DRAWING_LIFT, -fromNode.y),
    [fromNode.x, fromNode.y, fromNode.floor],
  )
  const to3D = useMemo(
    () => new THREE.Vector3(toNode.x, toNode.floor * FLOOR_HEIGHT + DRAWING_LIFT, -toNode.y),
    [toNode.x, toNode.y, toNode.floor],
  )

  const { mid, length, quaternion } = useMemo(() => {
    const m = new THREE.Vector3().addVectors(from3D, to3D).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(to3D, from3D)
    const len = dir.length()
    dir.normalize()
    const yAxis = new THREE.Vector3(0, 1, 0)
    const q = new THREE.Quaternion()
    if (Math.abs(dir.dot(yAxis) + 1) < 0.0001) {
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
    } else {
      q.setFromUnitVectors(yAxis, dir)
    }
    return { mid: m, length: len, quaternion: q }
  }, [from3D, to3D])

  const color = isSelected
    ? EDGE_SELECTED_COLOR
    : edge.isActivated
      ? EDGE_COLOR
      : EDGE_INACTIVE_COLOR

  return (
    <>
      <EdgePreview points={[from3D, to3D]} color={color} lineWidth={isSelected ? 3 : 2} />
      <mesh
        position={mid}
        quaternion={quaternion}
        onPointerDown={(e) => {
          e.stopPropagation()
          downRef.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          const start = downRef.current
          downRef.current = null
          if (!start) return
          if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return
          setPendingEdgeFromNodeId(null)
          setEditingEdgeId(edge.id)
        }}
      >
        <cylinderGeometry args={[0.12, 0.12, length, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  )
}

const VerticalNode = ({
  node,
  floorY,
  color,
  clickable,
  onSelect,
}: {
  node: NodeRecord
  floorY: number
  color: string
  clickable: boolean
  onSelect: () => void
}) => {
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
        if (!clickable) return
        e.stopPropagation()
        downRef.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={(e) => {
        if (!clickable) return
        e.stopPropagation()
        const start = downRef.current
        downRef.current = null
        if (!start) return
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD_PX) return
        onSelect()
      }}
    >
      <sphereGeometry args={[NODE_RADIUS, 32, 32]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

export const ConnectFloorEdgeLayer = ({ floor }: ConnectFloorEdgeLayerProps) => {
  const { pendingEdgeFromNodeId, setPendingEdgeFromNodeId, setIsSelectingFloor, editingEdgeId } =
    useMap()
  const queryClient = useQueryClient()

  const floorY = floor.floor * FLOOR_HEIGHT

  const { data: allNodes = [] } = useQuery({
    queryKey: ["nodes"],
    queryFn: getAllNodesData,
  })

  const { data: allEdges = [] } = useQuery({
    queryKey: ["edges"],
    queryFn: getAllEdgesData,
  })

  const nodeById = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes])

  // Edges that cross floors where at least one end is on the current floor.
  const crossFloorEdges = useMemo(() => {
    return allEdges.filter((e) => {
      const a = nodeById.get(e.fromNodeId)
      const b = nodeById.get(e.toNodeId)
      if (!a || !b) return false
      if (a.floor === b.floor) return false
      return a.floor === floor.floor || b.floor === floor.floor
    })
  }, [allEdges, nodeById, floor.floor])

  const fromNode = useMemo(
    () =>
      pendingEdgeFromNodeId ? (allNodes.find((n) => n.id === pendingEdgeFromNodeId) ?? null) : null,
    [pendingEdgeFromNodeId, allNodes],
  )

  // After selecting the source node, open the floor picker so the user can switch floors.
  useEffect(() => {
    if (fromNode !== null && fromNode.floor === floor.floor) {
      setIsSelectingFloor(true)
    }
  }, [fromNode?.id, fromNode?.floor, floor.floor, setIsSelectingFloor])

  const addEdgeMutation = useMutation({
    mutationFn: (toNode: NodeRecord) => {
      if (!fromNode) throw new Error("No source node")
      const floorDiff = Math.abs(fromNode.floor - toNode.floor)
      const distance =
        Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y) + FLOOR_DISTANCE_BONUS * floorDiff
      return addEdgeData({
        data: {
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          distance: Math.max(distance, 0.01),
          isActivated: fromNode.isActivated && toNode.isActivated,
          stairs: fromNode.type === "STAIR",
          elevators: fromNode.type === "ELEVATOR",
        },
      })
    },
    onSuccess: () => {
      setPendingEdgeFromNodeId(null)
      void queryClient.invalidateQueries({ queryKey: ["edges"] })
    },
  })

  // Only STAIR and ELEVATOR nodes are relevant for cross-floor connections.
  const verticalNodes = useMemo(
    () =>
      allNodes.filter(
        (n) => n.floor === floor.floor && (n.type === "STAIR" || n.type === "ELEVATOR"),
      ),
    [allNodes, floor.floor],
  )

  const handleBackgroundClick = useCallback(() => {
    setPendingEdgeFromNodeId(null)
  }, [setPendingEdgeFromNodeId])

  const handlers = useCanvasPointer({ onClick: handleBackgroundClick })

  const nodeColor = (node: NodeRecord): string => {
    if (node.id === pendingEdgeFromNodeId) return NODE_SOURCE_COLOR
    if (!node.isActivated) return NODE_INACTIVE_COLOR
    // On the target floor: dim nodes that don't match the source type.
    if (fromNode && fromNode.floor !== floor.floor && node.type !== fromNode.type) {
      return NODE_DIM_COLOR
    }
    return node.type === "STAIR" ? NODE_STAIR_COLOR : NODE_ELEVATOR_COLOR
  }

  const isClickable = (node: NodeRecord): boolean => {
    // No source yet: any vertical node can be the source.
    if (pendingEdgeFromNodeId === null) return true
    // Can't re-click the source.
    if (node.id === pendingEdgeFromNodeId) return false
    // Source selected but floor not switched yet: nothing to click.
    if (!fromNode || fromNode.floor === floor.floor) return false
    // On a different floor: only same-type nodes.
    return node.type === fromNode.type
  }

  const handleNodeSelect = useCallback(
    (node: NodeRecord) => {
      if (pendingEdgeFromNodeId === null) {
        setPendingEdgeFromNodeId(node.id)
      } else if (fromNode && fromNode.floor !== floor.floor && node.type === fromNode.type) {
        addEdgeMutation.mutate(node)
      }
    },
    [pendingEdgeFromNodeId, fromNode, floor.floor, setPendingEdgeFromNodeId, addEdgeMutation],
  )

  return (
    <>
      <RaycastPlane floor={floor} {...handlers} />

      {verticalNodes.map((node) => (
        <VerticalNode
          key={node.id}
          node={node}
          floorY={floorY}
          color={nodeColor(node)}
          clickable={isClickable(node)}
          onSelect={() => {
            handleNodeSelect(node)
          }}
        />
      ))}

      {/* Existing cross-floor edges touching this floor */}
      {crossFloorEdges.map((edge) => {
        const a = nodeById.get(edge.fromNodeId)
        const b = nodeById.get(edge.toNodeId)
        if (!a || !b) return null
        return (
          <ClickableCrossFloorEdge
            key={edge.id}
            edge={edge}
            fromNode={a}
            toNode={b}
            isSelected={edge.id === editingEdgeId}
          />
        )
      })}

      {/* Halo on the source node when it is on the current floor */}
      {fromNode?.floor === floor.floor && (
        <VertexMarker
          position={[fromNode.x, floorY + DRAWING_LIFT, -fromNode.y]}
          color={NODE_HIGHLIGHT_COLOR}
          radius={0.22}
        />
      )}
    </>
  )
}
