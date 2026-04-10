import { OrbitControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { Suspense, useMemo, useRef } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"

import { CameraRig } from "./camera-rig"
import { FLOOR_HEIGHT, MAX_POLAR_ANGLE, TOP_DOWN_POLAR } from "./constants"
import { CursorCoordinates } from "./cursor-coordinates"
import { FloorPlane } from "./floor-plane"

export const MapScene = () => {
  const { floors, currentFloor, renderMode } = useMap()
  const controlsRef = useRef(null)
  const neighbourOpacityRef = useRef(0)

  const activeFloor = currentFloor ?? 0
  const initialTarget = useMemo(
    () => new THREE.Vector3(0, activeFloor * FLOOR_HEIGHT, 0),
    [activeFloor],
  )

  return (
    <Canvas
      gl={{ antialias: true }}
      camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 20, 0.01] }}
      style={{ width: "100%", height: "100%" }}
    >
      <CameraRig
        activeFloor={activeFloor}
        controlsRef={controlsRef}
        neighbourOpacityRef={neighbourOpacityRef}
      />

      <OrbitControls
        ref={controlsRef}
        target={initialTarget}
        enableDamping
        dampingFactor={0.1}
        enablePan
        enableZoom
        enableRotate
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        minPolarAngle={renderMode === "2d" ? TOP_DOWN_POLAR : 0}
        maxPolarAngle={renderMode === "2d" ? TOP_DOWN_POLAR : MAX_POLAR_ANGLE}
      />

      <Suspense fallback={null}>
        {floors.map((floor) => (
          <FloorPlane
            key={floor.floor}
            floor={floor}
            active={floor.floor === activeFloor}
            neighbourOpacityRef={neighbourOpacityRef}
          />
        ))}

        <CursorCoordinates />
      </Suspense>
    </Canvas>
  )
}
