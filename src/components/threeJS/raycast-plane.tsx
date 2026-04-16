/* eslint-disable react/no-unknown-property */
import { useTexture } from "@react-three/drei"
import * as THREE from "three"

import type { ThreeEvent } from "@react-three/fiber"

import { FLOOR_HEIGHT } from "./constants"

import type { FloorPlan } from "#/types/floor-plan"

interface RaycastPlaneProps {
  floor: FloorPlan
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void
}

/**
 * Invisible horizontal mesh aligned with a floor's plane.
 *
 * Acts as the raycast target for click-to-world-coordinate conversion in
 * admin draw modes. Sized and positioned to coincide with the floor's
 * rendered image extent so clicks outside the visible floor don't register.
 *
 * The plane is rendered with `opacity: 0` (rather than `visible: false`) so
 * R3F still raycasts against it. `depthWrite: false` keeps it from interfering
 * with depth-sorting of any other transparent meshes on the same plane.
 */
export const RaycastPlane = ({
  floor,
  onPointerDown,
  onPointerUp,
  onPointerMove,
}: RaycastPlaneProps) => {
  const texture = useTexture(floor.path)
  const image = texture.image as HTMLImageElement
  // Match floor-plane.tsx exactly: image pixel dimensions × meters-per-pixel.
  const width = image.naturalWidth * floor.calibrationScale
  const height = image.naturalHeight * floor.calibrationScale

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, floor.floor * FLOOR_HEIGHT, 0]}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}
