/* eslint-disable react/no-unknown-property */
import { Line } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

/**
 * Reference zoom used for screen-size stabilization. Markers are scaled by
 * `BASE_CAMERA_ZOOM / camera.zoom` so their on-screen size stays constant
 * across zoom levels — shrinking in world space when the user zooms in and
 * growing when they zoom out.
 *
 * This is a tuning knob rather than a fact about the camera: raising it
 * makes markers visibly larger at every zoom (target screen size grows
 * linearly with this value). Lower it if markers feel bulky.
 */
const BASE_CAMERA_ZOOM = 60

interface VertexMarkerProps {
  position: THREE.Vector3 | [number, number, number]
  color?: string
  radius?: number
}

/**
 * A small sphere at a single world-space position. Used to mark polygon
 * vertices, snap targets, navigation nodes, and route waypoints. Pure
 * visual — no events, no state.
 *
 * Scales down when the user zooms in past `BASE_CAMERA_ZOOM` so precision
 * placement isn't hidden behind a huge blob. Never scales above 1.
 */
export const VertexMarker = ({ position, color = "#ffffff", radius = 0.06 }: VertexMarkerProps) => {
  const pos: [number, number, number] = Array.isArray(position)
    ? position
    : [position.x, position.y, position.z]
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ camera }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const zoom = (camera as THREE.OrthographicCamera).zoom
    if (!zoom) return
    mesh.scale.setScalar(BASE_CAMERA_ZOOM / zoom)
  })

  return (
    <mesh ref={meshRef} position={pos}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

interface EdgePreviewProps {
  points: readonly (THREE.Vector3 | [number, number, number])[]
  color?: string
  lineWidth?: number
  /** When true, appends the first point to the end so the polyline closes. */
  closed?: boolean
}

/**
 * A polyline drawn through a list of world-space points. Renders nothing
 * if fewer than two points are supplied. Used for in-progress polygon
 * preview, saved-room outlines, navigation edges, and route highlights.
 *
 * `lineWidth` is in screen-space pixels (drei `Line` uses meshline under
 * the hood) so the line stays visually consistent across zoom levels.
 */
export const EdgePreview = ({
  points,
  color = "#ffffff",
  lineWidth = 2,
  closed = false,
}: EdgePreviewProps) => {
  if (points.length < 2) return null
  const linePoints = closed && points.length >= 3 ? [...points, points[0]] : points

  return <Line points={linePoints} color={color} lineWidth={lineWidth} />
}
