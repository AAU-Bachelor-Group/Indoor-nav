/* eslint-disable react/no-unknown-property */
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"

/**
 * Small ring at the orbit pivot (`controls.target`). Without this, rotation
 * in 3D feels unmoored because the user has no visible reference for what
 * the camera is orbiting around. Hidden in 2D where rotate is disabled.
 *
 * The ring is sized in world units but rescaled per frame to stay roughly
 * constant on-screen (matching the node-marker convention).
 */
export const OrbitTargetMarker = () => {
  const { controlsRef, renderMode } = useMap()
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ camera }) => {
    const controls = controlsRef.current
    const mesh = meshRef.current
    if (!controls || !mesh) return
    mesh.position.copy(controls.target)
    const ortho = camera as THREE.OrthographicCamera
    if (ortho.isOrthographicCamera) {
      mesh.scale.setScalar(8 / Math.max(0.1, ortho.zoom))
    } else {
      mesh.scale.setScalar(camera.position.distanceTo(controls.target) / 60)
    }
  })

  if (renderMode !== "3d") return null

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
      <ringGeometry args={[0.18, 0.24, 32]} />
      <meshBasicMaterial
        color="#fbbf24"
        transparent
        opacity={0.7}
        depthTest={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
