/* eslint-disable react/no-unknown-property */
import { useTexture } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"

import { worldFromPixel } from "#/lib/coordinates"
import { useMap } from "#/lib/map-context"
import { floorToY } from "#/lib/three-utils"

import type { FloorPlan } from "#/types/floor-plan"

interface FloorPlaneProps {
  floor: FloorPlan
  active: boolean
  neighbourOpacityRef: React.RefObject<number>
}

/** Vertical thickness of the debug bounds slab (world units). */
const DEBUG_SLAB_HEIGHT = 0.5

/**
 * A single floor plan image rendered as a horizontal plane.
 * Active floors are fully opaque; inactive floors follow the
 * camera-tilt-based opacity from neighbourOpacityRef.
 */
export const FloorPlane = ({ floor, active, neighbourOpacityRef }: FloorPlaneProps) => {
  const { debugMode, floorExtentsRef } = useMap()
  const texture = useTexture(floor.path)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const image = texture.image as HTMLImageElement
  const { x: width, y: height } = worldFromPixel(image.width, image.height, floor)
  const y = floorToY(floor.floor)
  const debugColor = `hsl(${(floor.floor * 67) % 360}, 90%, 60%)`

  // Publish world-space half-extents so CameraRig can keep camera xz outside
  // the floor footprint at any tilt — otherwise WebGL slices the floor along
  // the camera's depth=0 plane at every non-zero polar.
  useEffect(() => {
    const extents = floorExtentsRef.current
    extents.set(floor.floor, { halfWidth: width / 2, halfHeight: height / 2 })
    return () => {
      extents.delete(floor.floor)
    }
  }, [floor.floor, width, height, floorExtentsRef])

  useFrame(() => {
    const material = materialRef.current
    const mesh = meshRef.current
    if (!material || !mesh) return

    if (active) {
      material.opacity = 1
      mesh.visible = true
      mesh.renderOrder = 1
    } else {
      const opacity = neighbourOpacityRef.current
      material.opacity = opacity
      mesh.visible = opacity > 0.01
      mesh.renderOrder = 0
    }
  })

  return (
    <>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, y, 0]}
        // Bounding sphere is anchored at the mesh's local origin (world XZ
        // origin), not at the user's pan target. Three.js' default frustum
        // culling drops the entire plane when the sphere falls outside the
        // frustum — even if visible geometry is still on-screen — so panning
        // away from the building can erase the whole floor at once.
        frustumCulled={false}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          side={THREE.DoubleSide}
          transparent
          depthWrite={false}
        />
      </mesh>
      {debugMode && (
        <lineSegments position={[0, y, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(width, DEBUG_SLAB_HEIGHT, height)]} />
          <lineBasicMaterial color={debugColor} />
        </lineSegments>
      )}
    </>
  )
}
