import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"
import { useMap } from "#/lib/map-context"

interface CompassProps {
  className?: string
}

/**
 * Google-Maps-style compass. Shows a two-tone needle rotated to indicate the
 * current map orientation; clicking resets the camera to "north up".
 *
 * Why not `controls.getAzimuthalAngle()`: in top-down 2D mode the polar angle
 * is nearly 0, which makes the camera-to-target offset almost vertical. The
 * internal spherical recomputation then produces a numerically unstable theta
 * that jumps around each frame. Instead we read the camera's world-up vector
 * (its local +Y in world space) and take its angle in the XZ plane — stable
 * regardless of polar tilt.
 */
export const Compass = ({ className }: CompassProps) => {
  const { controlsRef, isSelectingFloor } = useMap()
  const [angle, setAngle] = useState(0)
  const lastRef = useRef(0)

  useEffect(() => {
    const up = new THREE.Vector3()
    let raf: number

    const tick = () => {
      const controls = controlsRef.current
      if (controls) {
        up.set(0, 1, 0).applyQuaternion(controls.object.quaternion)
        const next = Math.atan2(up.x, -up.z)
        // OrbitControls' spherical recomputation is numerically unstable at
        // the near-zero polar angle used in 2D mode, which can flip the
        // quaternion by ~180° for a single frame. Reject such large jumps —
        // a real user rotation never covers that much angle per frame.
        const delta = Math.atan2(Math.sin(next - lastRef.current), Math.cos(next - lastRef.current))
        if (Math.abs(delta) > (Math.PI * 3) / 4) {
          raf = requestAnimationFrame(tick)
          return
        }
        if (Math.abs(delta) > 0.001) {
          lastRef.current = next
          setAngle(next)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    tick()
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [controlsRef])

  const resetRotation = () => {
    const controls = controlsRef.current
    if (!controls) return
    const camera = controls.object
    const offset = camera.position.clone().sub(controls.target)
    const spherical = new THREE.Spherical().setFromVector3(offset)
    spherical.theta = 0
    offset.setFromSpherical(spherical)
    camera.position.copy(controls.target).add(offset)
    camera.up.set(0, 1, 0)
    camera.lookAt(controls.target)
    controls.update()
  }

  if (isSelectingFloor) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="floating"
            size="icon-xl"
            type="button"
            onClick={resetRotation}
            aria-label="Reset rotation to north"
            className={className}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-7 transition-transform duration-150"
              style={{ transform: `rotate(${-angle}rad)` }}
              aria-hidden
            >
              <polygon points="12,3 8,13 12,11 16,13" fill="#ef4444" />
              <polygon points="12,21 8,13 12,15 16,13" fill="#cbd5e1" />
            </svg>
          </Button>
        }
      />
      <TooltipContent side="left">Reset rotation</TooltipContent>
    </Tooltip>
  )
}
