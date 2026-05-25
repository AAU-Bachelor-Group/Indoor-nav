import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three"

import {
  MAX_CAMERA_DISTANCE,
  MAX_CAMERA_ZOOM,
  MAX_POLAR_ANGLE,
  MIN_3D_POLAR_ANGLE,
  MIN_CAMERA_DISTANCE,
  MIN_CAMERA_ZOOM,
} from "./constants"

interface OrbitControlsLike {
  target: THREE.Vector3
  object: THREE.Camera
  enableZoom: boolean
  enableRotate: boolean
}

interface TouchGestureLockProps {
  controlsRef: React.RefObject<OrbitControlsLike | null>
}

/** Vertical drag of one full canvas height tilts the camera by this much. */
const TILT_PER_HEIGHT = Math.PI * 0.7
/** Accumulated rotation (twist) or tilt that commits the gesture to that mode (6°). */
const COMMIT_THRESHOLD = Math.PI / 15

/**
 * Google-Maps-style two-finger gestures:
 *
 *   pinch         → zoom
 *   twist         → rotate around the orbit target
 *   vertical drag → tilt (3D only)
 *
 * Twist and tilt are mutually exclusive within a single touch: whichever
 * crosses the commit threshold first wins for the rest of the gesture. Pinch
 * runs independently so you can zoom while rotating or tilting.
 *
 * OrbitControls (and every common replacement) ignores finger twist, so we
 * handle two-finger input ourselves and turn off `enableZoom` / `enableRotate`
 * while two fingers are down. One-finger pan and mouse/wheel pass through.
 */
export const TouchGestureLock = ({ controlsRef }: TouchGestureLockProps) => {
  const canvas = useThree((s) => s.gl.domElement)

  useEffect(() => {
    let active = false
    let prevDist = 1
    let prevAngle = 0
    let prevCy = 0
    let twistAccum = 0
    let tiltAccum = 0
    let mode: "idle" | "twist" | "tilt" = "idle"
    let savedZoom = true
    let savedRotate = true

    const readFingers = (e: TouchEvent) => {
      const a = e.touches[0]
      const b = e.touches[1]
      const dx = b.clientX - a.clientX
      const dy = b.clientY - a.clientY
      return {
        dist: Math.hypot(dx, dy),
        angle: Math.atan2(dy, dx),
        cy: (a.clientY + b.clientY) / 2,
      }
    }

    /** Wrap an angle delta into [-π, π] so the atan2 seam doesn't spike. */
    const wrap = (x: number) => {
      let v = x
      while (v > Math.PI) v -= 2 * Math.PI
      while (v < -Math.PI) v += 2 * Math.PI
      return v
    }

    /** Rotate camera around the orbit target's vertical (Y) axis. */
    const applyAzimuth = (deltaRad: number) => {
      const c = controlsRef.current
      if (!c) return
      const ox = c.object.position.x - c.target.x
      const oz = c.object.position.z - c.target.z
      const cos = Math.cos(deltaRad)
      const sin = Math.sin(deltaRad)
      c.object.position.x = c.target.x + ox * cos + oz * sin
      c.object.position.z = c.target.z - ox * sin + oz * cos
    }

    /** Tilt the camera. No-op in 2D where polar is pinned to top-down. */
    const applyPolar = (deltaRad: number) => {
      const c = controlsRef.current
      if (!c) return
      if ((c.object as THREE.OrthographicCamera).isOrthographicCamera) return
      const offset = new THREE.Vector3().subVectors(c.object.position, c.target)
      const sph = new THREE.Spherical().setFromVector3(offset)
      sph.phi = THREE.MathUtils.clamp(sph.phi + deltaRad, MIN_3D_POLAR_ANGLE, MAX_POLAR_ANGLE)
      offset.setFromSpherical(sph)
      c.object.position.copy(c.target).add(offset)
    }

    /** Zoom by a multiplicative ratio (>1 = fingers spreading = zoom in). */
    const applyPinch = (ratio: number) => {
      const c = controlsRef.current
      if (!c || ratio === 1) return
      const ortho = c.object as THREE.OrthographicCamera
      if (ortho.isOrthographicCamera) {
        ortho.zoom = THREE.MathUtils.clamp(ortho.zoom * ratio, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM)
        ortho.updateProjectionMatrix()
      } else {
        const offset = new THREE.Vector3().subVectors(c.object.position, c.target)
        const len = THREE.MathUtils.clamp(
          offset.length() / ratio,
          MIN_CAMERA_DISTANCE,
          MAX_CAMERA_DISTANCE,
        )
        offset.setLength(len)
        c.object.position.copy(c.target).add(offset)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      const c = controlsRef.current
      if (!c) return
      if (e.touches.length === 2 && !active) {
        const { dist, angle, cy } = readFingers(e)
        prevDist = dist || 1
        prevAngle = angle
        prevCy = cy
        twistAccum = 0
        tiltAccum = 0
        mode = "idle"
        savedZoom = c.enableZoom
        savedRotate = c.enableRotate
        c.enableZoom = false
        c.enableRotate = false
        active = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 2) return
      const c = controlsRef.current
      if (!c) return
      const { dist, angle, cy } = readFingers(e)
      const ratio = dist / Math.max(prevDist, 0.001)
      const dAngle = wrap(angle - prevAngle)
      const dTilt = (-(cy - prevCy) / canvas.clientHeight) * TILT_PER_HEIGHT

      twistAccum += dAngle
      tiltAccum += dTilt
      // Whichever accumulator crosses the threshold first wins the gesture.
      if (mode === "idle") {
        const twistScore = Math.abs(twistAccum) / COMMIT_THRESHOLD
        const tiltScore = Math.abs(tiltAccum) / COMMIT_THRESHOLD
        if (twistScore >= 1 || tiltScore >= 1) {
          mode = twistScore >= tiltScore ? "twist" : "tilt"
        }
      }

      applyPinch(ratio)
      if (mode === "twist") applyAzimuth(dAngle)
      else if (mode === "tilt") applyPolar(dTilt)
      c.object.lookAt(c.target)

      prevDist = dist
      prevAngle = angle
      prevCy = cy
    }

    const reset = () => {
      const c = controlsRef.current
      if (c && active) {
        c.enableZoom = savedZoom
        c.enableRotate = savedRotate
      }
      active = false
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) reset()
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: true })
    canvas.addEventListener("touchmove", onTouchMove, { passive: true })
    canvas.addEventListener("touchend", onTouchEnd, { passive: true })
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: true })
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart)
      canvas.removeEventListener("touchmove", onTouchMove)
      canvas.removeEventListener("touchend", onTouchEnd)
      canvas.removeEventListener("touchcancel", onTouchEnd)
      reset()
    }
  }, [canvas, controlsRef])

  return null
}
