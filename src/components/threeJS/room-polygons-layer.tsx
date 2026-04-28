/* eslint-disable react/no-unknown-property */
import { Html } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useRef, useState } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"
import { getRoomTypeMeta, getRoomTypeOutline } from "#/lib/room-types"
import { getAllRoomsData } from "#/server/room.functions"

import { useCanvasPointer } from "../hooks/use-canvas-pointer"

import { DRAWING_LIFT, FLOOR_HEIGHT } from "./constants"
import { EdgePreview } from "./draw-primitives"

import type { PersistedRoom, RoomVertex } from "#/server/room.server"

const ROOM_FILL_OPACITY = 0.6
const SELECTED_FILL_OPACITY = 0.8
const OUTLINE_WIDTH = 5
/** Tiny extra Y offset above DRAWING_LIFT for the outline so it doesn't z-fight the fill mesh. */
const OUTLINE_LIFT = 0.002
const ICON_HIDE_ZOOM_THRESHOLD_2D = 10.5
const ICON_HIDE_DISTANCE_THRESHOLD_3D = 45
/**
 * Render after FloorPlane (which sets renderOrder=1 on the active floor).
 * Without this, the floor texture paints over the polygon fill because
 * `depthWrite={false}` on the polygon material lets later draws cover it.
 */
const ROOM_RENDER_ORDER = 2

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
  const { roomOverlayMode } = useMap()
  const { camera } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const [iconVisible, setIconVisible] = useState(true)
  const iconVisibleRef = useRef(true)

  const geometry = useMemo(() => buildPolygonGeometry(room.vertices), [room.vertices])
  const fillColor = useMemo(() => getRoomTypeMeta(room.type).color, [room.type])
  const TypeIcon = useMemo(() => getRoomTypeMeta(room.type).icon, [room.type])
  const outlineColor = useMemo(() => getRoomTypeOutline(room.type), [room.type])
  const centroid = useMemo(() => computeCentroid(room.vertices), [room.vertices])

  const yFill = room.floor * FLOOR_HEIGHT + DRAWING_LIFT
  const yOutline = yFill + OUTLINE_LIFT
  const iconPosition = useMemo(
    () => new THREE.Vector3(centroid.x, yOutline, centroid.z),
    [centroid.x, centroid.z, yOutline],
  )

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

    let shouldShowIcon = roomOverlayMode === "icon" && active
    if (shouldShowIcon) {
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
        shouldShowIcon = (camera as THREE.OrthographicCamera).zoom >= ICON_HIDE_ZOOM_THRESHOLD_2D
      } else {
        shouldShowIcon = camera.position.distanceTo(iconPosition) <= ICON_HIDE_DISTANCE_THRESHOLD_3D
      }
    }

    if (shouldShowIcon !== iconVisibleRef.current) {
      iconVisibleRef.current = shouldShowIcon
      setIconVisible(shouldShowIcon)
    }
  })

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={[0, yFill, 0]}
        renderOrder={ROOM_RENDER_ORDER}
        {...pointerHandlers}
      >
        <meshBasicMaterial
          ref={materialRef}
          color={fillColor}
          transparent
          opacity={baseOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <EdgePreview points={outlinePoints} color={outlineColor} lineWidth={OUTLINE_WIDTH} closed />
      {active && roomOverlayMode === "icon" && iconVisible && (
        <Html position={[centroid.x, yOutline, centroid.z]} center zIndexRange={[0, 0]}>
          <div className="pointer-events-none rounded-full bg-black/60 p-1.5 text-white">
            <TypeIcon className="size-4" />
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
 * Click behavior branches on the active tool:
 * - `activeTool === "edit-room"` (admin): opens the edit metadata panel.
 * - `activeTool === null` (any user): opens the end-user info drawer.
 * - Any drawing tool: rooms are inert so the drawing layer owns clicks.
 */
export const RoomPolygonsLayer = ({ neighbourOpacityRef }: RoomPolygonsLayerProps) => {
  const {
    renderMode,
    currentFloor,
    activeTool,
    editingRoomId,
    setEditingRoomId,
    viewingRoomId,
    setViewingRoomId,
  } = useMap()

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

  const isEditing = activeTool === "edit-room"
  const isIdle = activeTool === "default"
  const roomsAreClickable = isEditing || isIdle

  const handleSelect = (id: string) => {
    if (isEditing) {
      setEditingRoomId(id)
    } else {
      setViewingRoomId(id)
    }
  }

  return (
    <>
      {visibleRooms.map((room) => (
        <RoomPolygon
          key={room.id}
          room={room}
          active={room.floor === currentFloor}
          selected={room.id === editingRoomId || room.id === viewingRoomId}
          editable={roomsAreClickable && room.floor === currentFloor}
          onSelect={() => {
            handleSelect(room.id)
          }}
          neighbourOpacityRef={neighbourOpacityRef}
        />
      ))}
    </>
  )
}
