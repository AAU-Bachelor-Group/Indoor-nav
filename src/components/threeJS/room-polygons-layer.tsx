/* eslint-disable react/no-unknown-property */
import { Html } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useQuery } from "@tanstack/react-query"
import polylabel from "polylabel"
import { useCallback, useMemo, useRef, useState } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"
import { useNavigation } from "#/lib/navigation-context"
import { getRoomTypeMeta, getRoomTypeOutline } from "#/lib/room-types"
import { floorToY } from "#/lib/three-utils"
import { getAllRoomsData } from "#/server/room.functions"

import { useCanvasPointer } from "../hooks/use-canvas-pointer"

import { DRAWING_LIFT } from "./constants"
import { EdgePreview } from "./draw-primitives"

import type { Room, RoomVertex } from "#/types/room"

const ROOM_FILL_OPACITY = 0.6
const SELECTED_FILL_OPACITY = 0.8
const OUTLINE_WIDTH = 5
/** Tiny extra Y offset above DRAWING_LIFT for the outline so it doesn't z-fight the fill mesh. */
const OUTLINE_LIFT = 0.002
const ICON_HIDE_ZOOM_THRESHOLD_2D = 10.5
const LABEL_SHOW_ZOOM_THRESHOLD_2D = 25
const ICON_HIDE_DISTANCE_THRESHOLD_3D = 45
const LABEL_SHOW_DISTANCE_THRESHOLD_3D = 28
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
  const n = vertices.length
  return {
    x: vertices.reduce((sum, v) => sum + v.x, 0) / n,
    z: vertices.reduce((sum, v) => sum + v.z, 0) / n,
  }
}

const computeIconAnchor = (vertices: RoomVertex[]): { x: number; z: number } => {
  if (vertices.length < 3) return computeCentroid(vertices)

  const outerRing = vertices.map((v) => [v.x, v.z] as [number, number])
  const [x, z] = polylabel([outerRing], 0.25)

  return { x, z }
}

interface RoomPolygonProps {
  room: Room
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
  const { roomOverlayMode, renderMode } = useMap()
  const { destination } = useNavigation()
  const { camera } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const [iconVisible, setIconVisible] = useState(true)
  const iconVisibleRef = useRef(true)
  const [labelVisible, setLabelVisible] = useState(false)
  const labelVisibleRef = useRef(false)

  const geometry = useMemo(() => buildPolygonGeometry(room.vertices), [room.vertices])
  const fillColor = useMemo(() => getRoomTypeMeta(room.type).color, [room.type])
  const TypeIcon = useMemo(() => getRoomTypeMeta(room.type).icon, [room.type])
  const outlineColor = useMemo(() => getRoomTypeOutline(room.type), [room.type])
  const iconAnchor = useMemo(() => computeIconAnchor(room.vertices), [room.vertices])

  const yFill = floorToY(room.floor, DRAWING_LIFT)
  const yOutline = yFill + OUTLINE_LIFT
  const iconPosition = useMemo(
    () => new THREE.Vector3(iconAnchor.x, yOutline, iconAnchor.z),
    [iconAnchor.x, iconAnchor.z, yOutline],
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
    let shouldShowLabel = false

    if (renderMode === "3d") {
      const isDestination = destination?.id === room.id
      shouldShowIcon = isDestination
      shouldShowLabel = isDestination
    }

    if (shouldShowIcon && renderMode !== "3d") {
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
        const zoom = (camera as THREE.OrthographicCamera).zoom
        shouldShowIcon = zoom >= ICON_HIDE_ZOOM_THRESHOLD_2D
        shouldShowLabel = zoom >= LABEL_SHOW_ZOOM_THRESHOLD_2D
      } else {
        const dist = camera.position.distanceTo(iconPosition)
        shouldShowIcon = dist <= ICON_HIDE_DISTANCE_THRESHOLD_3D
        shouldShowLabel = dist <= LABEL_SHOW_DISTANCE_THRESHOLD_3D
      }
    }

    if (shouldShowIcon !== iconVisibleRef.current) {
      iconVisibleRef.current = shouldShowIcon
      setIconVisible(shouldShowIcon)
    }
    if (shouldShowLabel !== labelVisibleRef.current) {
      labelVisibleRef.current = shouldShowLabel
      setLabelVisible(shouldShowLabel)
    }
  })

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={[0, yFill, 0]}
        renderOrder={ROOM_RENDER_ORDER}
        // Per-polygon bounding spheres can fall outside the frustum at
        // oblique camera angles even when part of the polygon is on-screen,
        // dropping rooms in clean horizontal bands. Cost of always drawing
        // these small meshes is negligible compared to the bug.
        frustumCulled={false}
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
        <Html
          position={[iconAnchor.x, yOutline, iconAnchor.z]}
          center
          zIndexRange={[0, 0]}
          pointerEvents="none"
        >
          <div className="pointer-events-none flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white whitespace-nowrap">
            <TypeIcon className="size-3" />
            {labelVisible && (
              <span>{room.displayName === "" ? room.roomNumber : room.displayName}</span>
            )}
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
 * - In both 2D and 3D modes, only the active floor's rooms are rendered.
 * - If the user has a navigation destination on a different floor, that
 *   single destination room is also rendered and highlighted.
 *   This keeps the scene focused while still showing the off-floor target.
 *
 * Click behavior branches on the active tool:
 * - `activeTool === "edit-room"` (admin): opens the edit metadata panel.
 * - `activeTool === null` (any user): opens the end-user info drawer.
 * - Any drawing tool: rooms are inert so the drawing layer owns clicks.
 */
export const RoomPolygonsLayer = ({ neighbourOpacityRef }: RoomPolygonsLayerProps) => {
  const {
    currentFloor,
    activeTool,
    editingRoomId,
    setEditingRoomId,
    viewingRoomId,
    setViewingRoomId,
    pickingStart,
  } = useMap()
  const { activeField, pickRoomForActiveField, destination } = useNavigation()

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
  })

  const offFloorDestinationRoom = useMemo(() => {
    if (!destination || destination.floor === currentFloor) return null
    return rooms.find((room) => room.id === destination.id) ?? null
  }, [rooms, currentFloor, destination])

  const visibleRooms = useMemo(() => {
    const currentFloorRooms = rooms.filter((r) => r.floor === currentFloor)
    return offFloorDestinationRoom
      ? [...currentFloorRooms, offFloorDestinationRoom]
      : currentFloorRooms
  }, [rooms, currentFloor, offFloorDestinationRoom])

  const isEditing = activeTool === "edit-room"
  const isIdle = activeTool === "default"
  const isPickingForNav = activeField !== null
  // Rooms are inert while the user is picking a coordinate on the map; clicks
  // would otherwise open the room info drawer on top of the pick overlay.
  const roomsAreClickable = (isEditing || isIdle || isPickingForNav) && !pickingStart

  const handleSelect = (room: Room) => {
    if (isPickingForNav) {
      // Mirrors the edit-room flow: while the navigation panel has an active
      // field, clicks populate it directly instead of opening the info drawer.
      pickRoomForActiveField(room)
    } else if (isEditing) {
      setEditingRoomId(room.id)
    } else {
      setViewingRoomId(room.id)
    }
  }

  return (
    <>
      {visibleRooms.map((room) => (
        <RoomPolygon
          key={room.id}
          room={room}
          active={room.floor === currentFloor || room.id === destination?.id}
          selected={
            room.id === editingRoomId || room.id === viewingRoomId || room.id === destination?.id
          }
          editable={roomsAreClickable && room.floor === currentFloor}
          onSelect={() => {
            handleSelect(room)
          }}
          neighbourOpacityRef={neighbourOpacityRef}
        />
      ))}
    </>
  )
}
