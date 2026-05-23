import { OrbitControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { Suspense, useCallback, useMemo, useRef } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"

import { AdaptiveGrid } from "./adaptive-grid"
import { CameraManager } from "./camera-manager"
import { CameraRig } from "./camera-rig"
import { ConnectEdgeLayer } from "./connect-edge-layer"
import {
  FLOOR_HEIGHT,
  MAX_CAMERA_DISTANCE,
  MAX_CAMERA_ZOOM,
  MAX_POLAR_ANGLE,
  MIN_3D_POLAR_ANGLE,
  MIN_CAMERA_DISTANCE,
  MIN_CAMERA_ZOOM,
  TOP_DOWN_POLAR,
} from "./constants"
import { CursorCoordinates } from "./cursor-coordinates"
import { DrawingLayer } from "./drawing-layer"
import { FloorPlane } from "./floor-plane"
import { FocusRig } from "./focus-rig"
import { GraphLayer } from "./graph-layer"
import { NavigationMarkers } from "./navigation-markers"
import { NavigationPathLayer } from "./navigation-path-layer"
import { OrbitTargetMarker } from "./orbit-target-marker"
import { RoomPolygonsLayer } from "./room-polygons-layer"

/** Tools whose workflow benefits from seeing the grid. */
const GRID_TOOLS = new Set(["draw-room", "draw-node", "connect-edge"])

export const MapScene = () => {
  const {
    floors,
    currentFloor,
    renderMode,
    activeTool,
    pickingStart,
    controlsRef,
    debugMode,
    setEditingRoomId,
    setViewingRoomId,
  } = useMap()
  const showGrid = debugMode || (activeTool !== "default" && GRID_TOOLS.has(activeTool))
  const activeFloorPlan = floors.find((f) => f.floor === currentFloor) ?? null
  const neighbourOpacityRef = useRef(0)

  const activeFloor = currentFloor ?? 0
  // Mount-only: re-creating this Vector3 on floor change would make drei copy
  // it onto controls.target, snapping x/z back to 0 and shifting the orbit
  // pivot. CameraRig owns the per-frame y-lerp toward the active floor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialTarget = useMemo(() => new THREE.Vector3(0, activeFloor * FLOOR_HEIGHT, 0), [])

  const handleBackgroundMiss = useCallback(() => {
    if (!pickingStart && (activeTool === "default" || activeTool === "edit-room")) {
      setEditingRoomId(null)
      setViewingRoomId(null)
    }
  }, [activeTool, pickingStart, setEditingRoomId, setViewingRoomId])

  // OrbitControls has built-in modifier-key inversion: with LEFT=PAN, holding
  // Shift/Ctrl/Cmd while left-click-dragging swaps to ROTATE automatically
  // (and vice versa for RIGHT=ROTATE). RIGHT must be explicit — drei applies
  // the prop object as-is, so a missing key would leave RIGHT undefined and
  // right-click would do nothing.
  const mouseButtons = useMemo(
    () => ({
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    }),
    [],
  )

  return (
    <Canvas
      gl={{ antialias: true }}
      scene={{ background: new THREE.Color("#333") }}
      style={{
        width: "100%",
        height: "100%",
        cursor: activeTool === "default" ? "default" : "crosshair",
      }}
      onPointerMissed={handleBackgroundMiss}
    >
      <CameraManager />
      <CameraRig
        activeFloor={activeFloor}
        controlsRef={controlsRef}
        neighbourOpacityRef={neighbourOpacityRef}
      />
      <FocusRig />

      <OrbitControls
        ref={controlsRef}
        target={initialTarget}
        enableDamping
        dampingFactor={0.15}
        enablePan
        enableZoom
        enableRotate
        // Pan along the world XZ plane instead of the screen plane. With the
        // screen-space variant, panning while tilted drags the orbit target's
        // Y off the active floor faster than CameraRig can lerp it back —
        // putting the camera at unexpected heights relative to the floor
        // planes, which manifests as clipping at oblique angles.
        screenSpacePanning={false}
        mouseButtons={mouseButtons}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        minPolarAngle={renderMode === "2d" ? TOP_DOWN_POLAR : MIN_3D_POLAR_ANGLE}
        maxPolarAngle={renderMode === "2d" ? TOP_DOWN_POLAR : MAX_POLAR_ANGLE}
        minDistance={MIN_CAMERA_DISTANCE}
        maxDistance={MAX_CAMERA_DISTANCE}
        minZoom={MIN_CAMERA_ZOOM}
        maxZoom={MAX_CAMERA_ZOOM}
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
        <NavigationMarkers />
        <OrbitTargetMarker />
        <NavigationPathLayer />
        {activeTool === "draw-room" && activeFloorPlan && <DrawingLayer floor={activeFloorPlan} />}
        {activeTool === "draw-node" && activeFloorPlan && <GraphLayer floor={activeFloorPlan} />}
        {activeTool === "connect-edge" && activeFloorPlan && (
          <ConnectEdgeLayer floor={activeFloorPlan} />
        )}
      </Suspense>
    </Canvas>
  )
}
