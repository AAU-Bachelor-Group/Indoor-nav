import { useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"

/**
 * Initial camera placement prop. Both cameras start here; subsequent state lives on the camera objects.
 */
const INITIAL_POSITION: [number, number, number] = [0, 50, 0]
const INITIAL_ORTHO_ZOOM = 5
const PERSP_FOV = 60
const NEAR = 0.1
const FAR = 1000

/**
 * Owns one `PerspectiveCamera` and one `OrthographicCamera`, swapping which
 * one R3F renders with whenever `renderMode` flips. Without this, R3F's
 * `<Canvas orthographic={…}>` only honours the prop on mount
 *
 * `<OrbitControls>` is recreated by drei when `state.camera` changes; its
 * `target` prop is a stable `Vector3` ref from `MapScene`, so the orbit
 * pivot survives the swap.
 */
export const CameraManager = () => {
  const { renderMode, controlsRef } = useMap()
  const { set, size } = useThree()

  const perspRef = useRef<THREE.PerspectiveCamera | null>(null)
  const orthoRef = useRef<THREE.OrthographicCamera | null>(null)
  const didInitRef = useRef(false)

  // Create the cameras once, after mount. R3F's default camera serves for
  // the brief moment before this effect runs; the swap effect below then
  // activates the right one via `set({ camera })`.
  useEffect(() => {
    const persp = new THREE.PerspectiveCamera(PERSP_FOV, size.width / size.height, NEAR, FAR)
    persp.position.set(...INITIAL_POSITION)
    persp.lookAt(0, 0, 0)
    perspRef.current = persp

    const ortho = new THREE.OrthographicCamera(
      -size.width / 2,
      size.width / 2,
      size.height / 2,
      -size.height / 2,
      NEAR,
      FAR,
    )
    ortho.position.set(...INITIAL_POSITION)
    ortho.zoom = INITIAL_ORTHO_ZOOM
    ortho.lookAt(0, 0, 0)
    ortho.updateProjectionMatrix()
    orthoRef.current = ortho
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep both cameras' frustums in sync with the canvas size.
  useEffect(() => {
    const persp = perspRef.current
    if (persp) {
      persp.aspect = size.width / size.height
      persp.updateProjectionMatrix()
    }
    const ortho = orthoRef.current
    if (ortho) {
      ortho.left = -size.width / 2
      ortho.right = size.width / 2
      ortho.top = size.height / 2
      ortho.bottom = -size.height / 2
      ortho.updateProjectionMatrix()
    }
  }, [size.width, size.height])

  // Activate the right camera on mount and every renderMode change. The first
  // run skips the cross-camera sync - there's no previous view to preserve,
  // and the initial values on each camera are already what we want.
  useEffect(() => {
    const persp = perspRef.current
    const ortho = orthoRef.current
    if (!persp || !ortho) return

    const toCamera = renderMode === "2d" ? ortho : persp

    if (didInitRef.current) {
      const fromCamera = renderMode === "2d" ? persp : ortho
      const target = controlsRef.current?.target ?? new THREE.Vector3(0, 0, 0)

      // Match visible world span across the swap so the building doesn't
      // appear to jump. Direction from target stays the same; only distance
      // (perspective) or zoom (ortho) is recomputed.
      const offset = fromCamera.position.clone().sub(target)
      const dir = offset.lengthSq() > 0 ? offset.clone().normalize() : new THREE.Vector3(0, 1, 0)
      const halfFov = THREE.MathUtils.degToRad(persp.fov / 2)

      if (renderMode === "2d") {
        // perspective → ortho. Match ortho's visible height (canvas / zoom)
        // to the perspective's visible world height (2·d·tan(fov/2)).
        const dist = offset.length()
        const visibleH = 2 * dist * Math.tan(halfFov)
        ortho.zoom = visibleH > 0 ? size.height / visibleH : INITIAL_ORTHO_ZOOM
        ortho.position.copy(target).addScaledVector(dir, dist)
        ortho.quaternion.copy(fromCamera.quaternion)
        ortho.updateProjectionMatrix()
      } else {
        // ortho → perspective. Choose distance so perspective's visible
        // height matches ortho's canvas/zoom.
        const visibleH = size.height / Math.max(0.0001, ortho.zoom)
        const newDist = visibleH / (2 * Math.tan(halfFov))
        persp.position.copy(target).addScaledVector(dir, newDist)
        persp.quaternion.copy(fromCamera.quaternion)
        persp.updateProjectionMatrix()
      }
    } else {
      didInitRef.current = true
    }

    set({ camera: toCamera })
  }, [renderMode, set, size.height, controlsRef])

  return null
}
