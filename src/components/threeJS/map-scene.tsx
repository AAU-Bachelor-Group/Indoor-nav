import { OrbitControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { Suspense, useMemo, useRef } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"

import { AdaptiveGrid } from "./adaptive-grid"
import { CameraRig } from "./camera-rig"
import { FLOOR_HEIGHT, MAX_POLAR_ANGLE, TOP_DOWN_POLAR } from "./constants"
import { CursorCoordinates } from "./cursor-coordinates"
import { DrawingLayer } from "./drawing-layer"
import { FloorPlane } from "./floor-plane"
import { GraphLayer } from "./graph-layer"
import { RoomPolygonsLayer } from "./room-polygons-layer"

/** Tools whose workflow benefits from seeing the grid. */
const GRID_TOOLS = new Set(["draw-room", "draw-node", "connect-edge"])

export const MapScene = () => {
  const { floors, currentFloor, renderMode, activeTool, controlsRef, debugMode } = useMap()
  const showGrid = debugMode || (activeTool !== "default" && GRID_TOOLS.has(activeTool))
  const activeFloorPlan = floors.find((f) => f.floor === currentFloor) ?? null
  const neighbourOpacityRef = useRef(0)

  const activeFloor = currentFloor ?? 0
  const initialTarget = useMemo(
    () => new THREE.Vector3(0, activeFloor * FLOOR_HEIGHT, 0),
    [activeFloor],
  )

  return (
    <Canvas
      gl={{ antialias: true }}
      scene={{ background: new THREE.Color("#333") }}
      camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 50, 0], zoom: 5 }}
      style={{
        width: "100%",
        height: "100%",
        cursor: activeTool === "default" ? "default" : "crosshair",
      }}
      orthographic={renderMode === "2d"}
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

        <AdaptiveGrid visible={showGrid} />
        <CursorCoordinates />
        <RoomPolygonsLayer neighbourOpacityRef={neighbourOpacityRef} />
        {activeTool === "draw-room" && activeFloorPlan && <DrawingLayer floor={activeFloorPlan} />}
        {activeTool === "draw-node" && activeFloorPlan && <GraphLayer floor={activeFloorPlan} />}
      </Suspense>
    </Canvas>
  )
}
