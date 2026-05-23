import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"

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

/**
 * Safety margin past the floor's farthest corner. Camera depth=0 plane must
 * not intersect any floor geometry — keep a small buffer so we don't sit
 * exactly on the boundary.
 */
const CAMERA_CLEARANCE_FACTOR = 1.05

interface CameraRigProps {
  activeFloor: number
  controlsRef: React.RefObject<OrbitControlsLike | null>
  neighbourOpacityRef: React.RefObject<number>
}

/**
 * Per-frame camera-related work:
 * 1. Smoothly re-centre the orbit target on the active floor.
 * 2. Compute neighbour-floor opacity from the camera tilt angle.
 * 3. Raise `minDistance` with tilt so the floor never crosses the camera's
 *    depth=0 plane (otherwise WebGL slices it at the near plane).
 * 4. Modulate `rotateSpeed` so 3D rotation stays usable when zoomed out
 *    (uniform-angular rotation around a distant target swings wildly).
 */
export const CameraRig = ({ activeFloor, controlsRef, neighbourOpacityRef }: CameraRigProps) => {
  const { floorExtentsRef } = useMap()

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

    // Raise minDistance with tilt so the whole floor stays in front of the
    // camera. A floor point at projected radial distance `p` from the target
    // along the camera's xz forward direction has depth `dist − sin(θ)·p`;
    // to keep the farthest floor corner at depth > 0 we need
    // `dist > sin(θ) · cornerRadius`. Without this, anything past the
    // camera's xz position sits at depth ≤ 0 and WebGL slices it along a
    // clean horizontal line at the bottom of the screen.
    const extents = floorExtentsRef.current.get(activeFloor)
    if (extents) {
      const dx = Math.max(
        Math.abs(controls.target.x - extents.halfWidth),
        Math.abs(controls.target.x + extents.halfWidth),
      )
      const dz = Math.max(
        Math.abs(controls.target.z - extents.halfHeight),
        Math.abs(controls.target.z + extents.halfHeight),
      )
      const cornerRadius = Math.hypot(dx, dz) * CAMERA_CLEARANCE_FACTOR
      const dynamicMin = Math.max(MIN_CAMERA_DISTANCE, Math.sin(polarAngle) * cornerRadius)
      controls.minDistance = dynamicMin

      // OrbitControls re-clamps radius to minDistance on zoom input, but tilt
      // input doesn't — so a fresh tilt that just shrank the safe envelope
      // would leave the camera inside it for a frame. Push it out now.
      const offset = controls.object.position.clone().sub(controls.target)
      const currentDist = offset.length()
      if (currentDist > 0 && currentDist < dynamicMin) {
        offset.multiplyScalar(dynamicMin / currentDist)
        controls.object.position.copy(controls.target).add(offset)
      }
    }

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
