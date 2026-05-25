import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import {
  BASE_PAN_SPEED,
  BASE_ROTATE_SPEED,
  FLOOR_HEIGHT,
  MIN_CAMERA_DISTANCE,
  NEIGHBOUR_MAX_OPACITY,
  REF_2D_ZOOM,
  REF_3D_DISTANCE,
  TILT_FADE_END,
  TILT_FADE_START,
} from "./constants"

/** Floor-Y damp lambda. Tuned to match the previous lerp(0.08) feel at 60fps
 * but frame-rate independent so it doesn't fight FocusRig's XZ damp during
 * focus animations. */
const FLOOR_Y_LAMBDA = 6

interface OrbitControlsLike {
  target: THREE.Vector3
  object: THREE.Camera
  panSpeed: number
  rotateSpeed: number
  minDistance: number
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
  useFrame((_, rawDt) => {
    const controls = controlsRef.current
    if (!controls) return

    // Cap dt so a tab-resume doesn't snap the camera in one frame.
    const dt = Math.min(rawDt, 0.1)

    // Smoothly re-centre on the active floor. Pan the camera by the same
    // delta so the orbit angle/distance stays exactly the same — otherwise
    // the camera "tilts" as target.y moves while camera.y is fixed, which
    // shows up as jank during focus animations on a different floor.
    // Uses `damp` (time-based) instead of `lerp` (frame-count-based) so it
    // converges at the same rate as FocusRig regardless of frame rate.
    const targetY = activeFloor * FLOOR_HEIGHT
    const prevY = controls.target.y
    controls.target.y = THREE.MathUtils.damp(controls.target.y, targetY, FLOOR_Y_LAMBDA, dt)
    controls.object.position.y += controls.target.y - prevY

    // Compute neighbour opacity from tilt angle
    const polarAngle = controls.getPolarAngle()
    const t = THREE.MathUtils.smoothstep(polarAngle, TILT_FADE_START, TILT_FADE_END)
    neighbourOpacityRef.current = t * NEIGHBOUR_MAX_OPACITY

    controls.minDistance = MIN_CAMERA_DISTANCE

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
