/* eslint-disable react/no-unknown-property */
import { useTexture } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

import { worldFromPixel } from "#/lib/coordinates"

import { FLOOR_HEIGHT } from "./constants"

import type { FloorPlan } from "#/types/floor-plan"

interface FloorPlaneProps {
  floor: FloorPlan
  active: boolean
  neighbourOpacityRef: React.RefObject<number>
}

/**
 * A single floor plan image rendered as a horizontal plane.
 * Active floors are fully opaque; inactive floors follow the
 * camera-tilt-based opacity from neighbourOpacityRef.
 */
export const FloorPlane = ({ floor, active, neighbourOpacityRef }: FloorPlaneProps) => {
  const texture = useTexture(floor.path)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  const image = texture.image as HTMLImageElement
  const { x: width, y: height } = worldFromPixel(image.width, image.height, floor)

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
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, floor.floor * FLOOR_HEIGHT, 0]}
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
  )
}
