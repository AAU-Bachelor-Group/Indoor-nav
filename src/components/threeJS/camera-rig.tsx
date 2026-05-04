import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import {
  BASE_PAN_SPEED,
  BASE_ROTATE_SPEED,
  FLOOR_HEIGHT,
  LERP_SPEED,
  NEIGHBOUR_MAX_OPACITY,
  REF_2D_ZOOM,
  REF_3D_DISTANCE,
  TILT_FADE_END,
  TILT_FADE_START,
} from "./constants"

interface OrbitControlsLike {
  target: THREE.Vector3
  object: THREE.Camera
  panSpeed: number
  rotateSpeed: number
  getPolarAngle: () => number
}

interface CameraRigProps {
  activeFloor: number
  controlsRef: React.RefObject<OrbitControlsLike | null>
  neighbourOpacityRef: React.RefObject<number>
}

/**
 * Per-frame camera-related work:
 * 1. Smoothly re-centre the orbit target on the active floor.
 * 2. Compute neighbour-floor opacity from the camera tilt angle.
 * 3. Modulate `rotateSpeed` so 3D rotation stays usable when zoomed out
 *    (uniform-angular rotation around a distant target swings wildly).
 */
export const CameraRig = ({ activeFloor, controlsRef, neighbourOpacityRef }: CameraRigProps) => {
  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return

    // Smoothly re-centre on the active floor
    const targetY = activeFloor * FLOOR_HEIGHT
    controls.target.y = THREE.MathUtils.lerp(controls.target.y, targetY, LERP_SPEED)

    // Compute neighbour opacity from tilt angle
    const polarAngle = controls.getPolarAngle()
    const t = THREE.MathUtils.smoothstep(polarAngle, TILT_FADE_START, TILT_FADE_END)
    neighbourOpacityRef.current = t * NEIGHBOUR_MAX_OPACITY

    // Adaptive rotateSpeed only. OrbitControls' built-in pan formula already
    // scales world-units-per-pixel with distance / zoom (via
    // `screenSpacePanning`), so multiplying panSpeed on top of that breaks
    // 1:1 cursor tracking. Rotation is uniform-angular instead, so without
    // adaptation a small drag at far distance produces a huge visual swing.
    const ortho = controls.object as THREE.OrthographicCamera
    const isOrtho = ortho.isOrthographicCamera
    const distanceFactor = isOrtho
      ? REF_2D_ZOOM / Math.max(0.1, ortho.zoom)
      : controls.object.position.distanceTo(controls.target) / REF_3D_DISTANCE
    const speedScale = THREE.MathUtils.clamp(1 / distanceFactor, 0.4, 1.2)
    controls.panSpeed = BASE_PAN_SPEED
    controls.rotateSpeed = BASE_ROTATE_SPEED * speedScale
  })

  return null
}
