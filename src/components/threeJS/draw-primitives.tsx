/* eslint-disable react/no-unknown-property */
import { Line } from "@react-three/drei"
import * as THREE from "three"

interface VertexMarkerProps {
  position: THREE.Vector3 | [number, number, number]
  color?: string
  radius?: number
}

/**
 * A small sphere at a single world-space position. Used to mark polygon
 * vertices, snap targets, navigation nodes, and route waypoints. Pure
 * visual — no events, no state.
 */
export const VertexMarker = ({ position, color = "#ffffff", radius = 0.06 }: VertexMarkerProps) => {
  const pos: [number, number, number] = Array.isArray(position)
    ? position
    : [position.x, position.y, position.z]

  return (
    <mesh position={pos}>
      <sphereGeometry args={[radius, 16, 16]} />
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
