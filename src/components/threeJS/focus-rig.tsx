import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"

import {
  MAX_CAMERA_DISTANCE,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_DISTANCE,
  MIN_CAMERA_ZOOM,
} from "./constants"

/** How fast XZ pan and zoom/distance damp toward the focus request. */
const DAMP_LAMBDA = 6

/** Settle thresholds. World units for XZ, fractional for zoom/distance. */
const SETTLE_XZ = 0.05
const SETTLE_ZOOM_FRAC = 0.02
const SETTLE_DISTANCE_FRAC = 0.02

/**
 * Per-frame animator that drives `controls.target` and the camera's zoom /
 * distance toward whatever `focusRequestRef` points at. Set by `focusTarget`
 * on the map context, cleared when the animation settles. New requests
 * override in-flight ones — the latest call wins.
 *
 * `targetSpan` (world units) is converted to a zoom (ortho) or distance
 * (perspective) using the camera's actual frustum here, so the right framing
 * is achieved regardless of canvas size or FOV.
 *
 * Floor change is *not* handled here — `focusTarget` writes `currentFloor`
 * eagerly, and `CameraRig` already smoothly lerps `target.y`.
 */
export const FocusRig = () => {
  const { controlsRef, focusRequestRef } = useMap()

  useFrame((_, rawDt) => {
    const controls = controlsRef.current
    const req = focusRequestRef.current
    if (!controls || !req) return

    // Cap dt so a tab-resume doesn't snap the camera in one frame.
    const dt = Math.min(rawDt, 0.1)

    controls.target.x = THREE.MathUtils.damp(controls.target.x, req.worldX, DAMP_LAMBDA, dt)
    controls.target.z = THREE.MathUtils.damp(controls.target.z, req.worldZ, DAMP_LAMBDA, dt)

    const ortho = controls.object as THREE.OrthographicCamera
    const isOrtho = ortho.isOrthographicCamera

    let zoomDone = true
    if (isOrtho && req.targetSpan !== undefined) {
      // (right - left) and (top - bottom) at zoom = 1 are the canvas size in
      // world units. The smaller axis is the limiting factor for fitting.
      const visibleSmallSide = Math.min(ortho.right - ortho.left, ortho.top - ortho.bottom)
      const targetZoom = THREE.MathUtils.clamp(
        visibleSmallSide / req.targetSpan,
        MIN_CAMERA_ZOOM,
        MAX_CAMERA_ZOOM,
      )
      ortho.zoom = THREE.MathUtils.damp(ortho.zoom, targetZoom, DAMP_LAMBDA, dt)
      ortho.updateProjectionMatrix()
      zoomDone = Math.abs(ortho.zoom - targetZoom) / targetZoom < SETTLE_ZOOM_FRAC
    }

    let distDone = true
    if (!isOrtho && req.targetSpan !== undefined) {
      // For a perspective camera, fitting `span` vertically requires
      // distance = span / (2 * tan(fov/2)).
      const persp = controls.object as THREE.PerspectiveCamera
      const halfFov = THREE.MathUtils.degToRad(persp.fov / 2)
      const targetDistance = THREE.MathUtils.clamp(
        req.targetSpan / (2 * Math.tan(halfFov)),
        MIN_CAMERA_DISTANCE,
        MAX_CAMERA_DISTANCE,
      )
      // Damp distance along the camera→target ray. Preserves polar angle
      // (tilt) so we don't fight the user's chosen viewing angle.
      const offset = controls.object.position.clone().sub(controls.target)
      const currentDist = offset.length()
      if (currentDist > 0.001) {
        const newDist = THREE.MathUtils.damp(currentDist, targetDistance, DAMP_LAMBDA, dt)
        offset.multiplyScalar(newDist / currentDist)
        controls.object.position.copy(controls.target).add(offset)
        distDone = Math.abs(newDist - targetDistance) / targetDistance < SETTLE_DISTANCE_FRAC
      }
    }

    // Don't gate on `controls.target.y` — that's lerping toward the active
    // floor at LERP_SPEED via CameraRig and may take longer than the focus.
    const xzDone =
      Math.hypot(controls.target.x - req.worldX, controls.target.z - req.worldZ) < SETTLE_XZ

    if (xzDone && zoomDone && distDone) {
      focusRequestRef.current = null
    }
  })

  return null
}
