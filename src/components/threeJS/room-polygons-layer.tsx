/* eslint-disable react/no-unknown-property */
import { Html } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useRef } from "react"
import * as THREE from "three"

import { useIsLoggedIn } from "#/lib/auth-hooks"
import { useMap } from "#/lib/map-context"
import { getAllRoomsData } from "#/server/room.functions"

import { DRAWING_LIFT, FLOOR_HEIGHT } from "./constants"
import { EdgePreview } from "./draw-primitives"
import { getRoomTypeStyle } from "./room-type-styles"
import { useCanvasPointer } from "./use-canvas-pointer"

import type { PersistedRoom, RoomVertex } from "#/server/room.server"

const ROOM_FILL_OPACITY = 0.45
const SELECTED_FILL_OPACITY = 0.7
const OUTLINE_WIDTH = 5
/** Tiny extra Y offset above DRAWING_LIFT for the outline so it doesn't z-fight the fill mesh. */
const OUTLINE_LIFT = 0.002

const buildPolygonGeometry = (vertices: RoomVertex[]): THREE.BufferGeometry => {
  // Triangulate the (x, z) ring with earcut (wrapped by THREE.ShapeUtils).
  const contour = vertices.map((v) => new THREE.Vector2(v.x, v.z))
  const triangles = THREE.ShapeUtils.triangulateShape(contour, [])

  // Flat 3D positions: local Y stays 0, the mesh's position handles Y placement.
  // No rotation needed because we lay the polygon directly in the world XZ plane.
  const positions = new Float32Array(vertices.length * 3)
  for (let i = 0; i < vertices.length; i++) {
    positions[i * 3] = vertices[i].x
    positions[i * 3 + 1] = 0
    positions[i * 3 + 2] = vertices[i].z
  }

  const indices: number[] = []
  for (const tri of triangles) {
    indices.push(tri[0], tri[1], tri[2])
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const computeCentroid = (vertices: RoomVertex[]): { x: number; z: number } => {
  let sumX = 0
  let sumZ = 0
  for (const v of vertices) {
    sumX += v.x
    sumZ += v.z
  }
  const n = vertices.length
  return { x: sumX / n, z: sumZ / n }
}

interface RoomPolygonProps {
  room: PersistedRoom
  active: boolean
  selected: boolean
  editable: boolean
  onSelect: () => void
  neighbourOpacityRef: React.RefObject<number>
}

/**
 * Single saved-room rendering: triangulated fill + EdgePreview outline +
 * a drei `<Html>` label at the centroid. Mirrors `floor-plane.tsx`'s
 * useFrame-based fade so non-active floors fade with camera tilt.
 *
 * When `editable` is true, the mesh listens for clicks (with the same
 * click-vs-drag disambiguation `<DrawingLayer>` uses) and calls `onSelect`
 * on a real click. Outside edit mode the mesh is inert and clicks are
 * reserved for the future user-facing room card.
 */
const RoomPolygon = ({
  room,
  active,
  selected,
  editable,
  onSelect,
  neighbourOpacityRef,
}: RoomPolygonProps) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  const geometry = useMemo(() => buildPolygonGeometry(room.vertices), [room.vertices])
  const styles = useMemo(() => getRoomTypeStyle(room.type), [room.type])
  const centroid = useMemo(() => computeCentroid(room.vertices), [room.vertices])

  const yFill = room.floor * FLOOR_HEIGHT + DRAWING_LIFT
  const yOutline = yFill + OUTLINE_LIFT

  // Outline points (open ring) projected to 3D at the outline Y level.
  const outlinePoints = useMemo<[number, number, number][]>(
    () => room.vertices.map((v) => [v.x, yOutline, v.z]),
    [room.vertices, yOutline],
  )

  const handleClick = useCallback(() => {
    onSelect()
  }, [onSelect])

  const pointerHandlers = useCanvasPointer({
    onClick: handleClick,
    enabled: editable,
  })

  // Selected rooms get a higher base opacity so it's obvious which one
  // the metadata panel is bound to.
  const baseOpacity = selected ? SELECTED_FILL_OPACITY : ROOM_FILL_OPACITY

  useFrame(() => {
    const material = materialRef.current
    const mesh = meshRef.current
    if (!material || !mesh) return

    if (active) {
      material.opacity = baseOpacity
      mesh.visible = true
    } else {
      const fade = neighbourOpacityRef.current
      material.opacity = fade * baseOpacity
      mesh.visible = fade > 0.01
    }
  })

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} position={[0, yFill, 0]} {...pointerHandlers}>
        <meshBasicMaterial
          ref={materialRef}
          color={styles.fill}
          transparent
          opacity={baseOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <EdgePreview
        points={outlinePoints}
        color={styles.outline}
        lineWidth={OUTLINE_WIDTH}
        closed
      />
      {active && (
        <Html position={[centroid.x, yOutline, centroid.z]} center>
          <div className="pointer-events-none rounded bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-white whitespace-nowrap">
            {room.roomNumber}
          </div>
        </Html>
      )}
    </>
  )
}

interface RoomPolygonsLayerProps {
  neighbourOpacityRef: React.RefObject<number>
}

/**
 * Renders every saved room across all floors.
 *
 * - In 2D mode, only the active floor's rooms are rendered (per-floor
 *   layering on a flat top-down view doesn't make sense).
 * - In 3D mode, every room renders; non-active floors fade with the
 *   camera tilt, mirroring how `floor-plane.tsx` already fades non-active
 *   floor rasters via `neighbourOpacityRef`.
 *
 * Labels (room number) only render on the active floor to avoid clutter.
 *
 * Click-to-edit: editing is the **default** for admins. As long as a
 * logged-in user is not currently drawing a new polygon, every room on
 * the active floor is clickable and calls `setEditingRoomId(room.id)` on
 * a real click. Non-admin clicks are inert and reserved for the future
 * user-facing room card.
 */
export const RoomPolygonsLayer = ({ neighbourOpacityRef }: RoomPolygonsLayerProps) => {
  const { renderMode, currentFloor, activeTool, editingRoomId, setEditingRoomId } = useMap()
  const { isLoggedIn } = useIsLoggedIn()

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
  })

  const visibleRooms = useMemo(() => {
    if (renderMode === "2d") {
      return rooms.filter((r) => r.floor === currentFloor)
    }
    return rooms
  }, [rooms, renderMode, currentFloor])

  // Editing is the default for admins outside of draw mode. Click-vs-drag
  // disambiguation in `useCanvasPointer` keeps OrbitControls drag-to-pan
  // from accidentally selecting a room.
  const canEditRooms = isLoggedIn && activeTool !== "draw-room"

  return (
    <>
      {visibleRooms.map((room) => (
        <RoomPolygon
          key={room.id}
          room={room}
          active={room.floor === currentFloor}
          selected={room.id === editingRoomId}
          editable={canEditRooms && room.floor === currentFloor}
          onSelect={() => {
            setEditingRoomId(room.id)
          }}
          neighbourOpacityRef={neighbourOpacityRef}
        />
      ))}
    </>
  )
}
