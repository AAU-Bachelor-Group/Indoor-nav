/**
 * Polygon validation utilities for the room drawing tool. All checks operate
 * in the floor's local 2D plane: each function takes points with `x` and `z`
 * fields (the floor's right and forward axes — three.js Y, the floor stacking
 * dimension, is dropped). `THREE.Vector3` satisfies this shape structurally
 * so callers can pass either raw `{ x, z }` records or click-derived vectors.
 *
 * No external geometry dependency: a self-intersection test is small enough
 * to write directly, and avoiding `@turf/*` keeps the bundle lean. If we
 * later need things like buffer / boolean ops we can introduce turf at that
 * point.
 */

/** A 2D point in the floor frame. `THREE.Vector3` matches this structurally. */
export interface PlanePoint {
  x: number
  z: number
}

/** A polygon obstacle (existing room) for the overlap check. */
export interface PolygonObstacle {
  vertices: readonly PlanePoint[]
  /** Human-readable label used in validation error messages, e.g. room number. */
  label: string
}

/** Cross-product orientation of three 2D points (in the X/Z plane). */
const orientation = (p: PlanePoint, q: PlanePoint, r: PlanePoint): number => {
  const val = (q.z - p.z) * (r.x - q.x) - (q.x - p.x) * (r.z - q.z)
  if (val === 0) return 0
  return val > 0 ? 1 : -1
}

/**
 * Returns true if open segments AB and CD cross each other at any interior
 * point. Touching only at endpoints is NOT counted as an intersection — that
 * lets adjacent polygon edges (which share a vertex) pass, and lets two
 * polygons that share an edge or a corner pass.
 */
const segmentsCross = (a: PlanePoint, b: PlanePoint, c: PlanePoint, d: PlanePoint): boolean => {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)

  // General case: the four orientations split into two distinct halves on
  // each line, which is exactly the condition for proper crossing.
  if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4) {
    return true
  }

  // Collinear / endpoint-touching cases are deliberately NOT treated as
  // crossings here. Self-intersection in a polygon-drawing context means
  // "edges visibly cross", not "edges meet at a shared vertex". For the
  // multi-polygon overlap check this also lets shared walls and corners pass.
  return false
}

/**
 * Strict point-in-polygon test (ray casting). Returns true only if `p` is
 * in the polygon's interior; points on the boundary (including exactly
 * shared vertices) are NOT inside.
 *
 * The strictness comes from the `>` (not `>=`) comparison on z: when the
 * test point sits exactly on a vertex of the polygon, the inequality
 * doesn't flip and the parity stays even, so the point is classified as
 * outside. That's the behavior we need so shared corners pass.
 */
export const pointStrictlyInsidePolygon = (
  p: PlanePoint,
  polygon: readonly PlanePoint[],
): boolean => {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x
    const zi = polygon[i].z
    const xj = polygon[j].x
    const zj = polygon[j].z
    const intersects = zi > p.z !== zj > p.z && p.x < ((xj - xi) * (p.z - zi)) / (zj - zi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/**
 * Returns the index of the first edge in the open polyline `vertices[0..n-1]`
 * that crosses another non-adjacent edge, or null if the polyline is simple.
 */
export const openPolylineSelfIntersection = (vertices: readonly PlanePoint[]): number | null => {
  const n = vertices.length
  if (n < 4) return null
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n - 1; j++) {
      if (segmentsCross(vertices[i], vertices[i + 1], vertices[j], vertices[j + 1])) {
        return i
      }
    }
  }
  return null
}

/**
 * Returns true if closing the polyline (drawing an edge from `vertices[n-1]`
 * back to `vertices[0]`) would cross any non-adjacent existing edge.
 */
export const closingEdgeIntersectsPolyline = (vertices: readonly PlanePoint[]): boolean => {
  const n = vertices.length
  if (n < 4) return false
  const closingStart = vertices[n - 1]
  const closingEnd = vertices[0]
  for (let i = 1; i <= n - 3; i++) {
    if (segmentsCross(closingStart, closingEnd, vertices[i], vertices[i + 1])) {
      return true
    }
  }
  return false
}

/**
 * Returns true if polygons A and B share interior area.
 *
 * Boundary-only contact (shared edges, shared vertices, vertex-on-edge)
 * does NOT count as overlap — this is the client-side mirror of the
 * server-side `ST_Relate(... 'T********')` check. It lets adjacent rooms
 * that share a wall or a corner coexist.
 *
 * Detection has two parts:
 * 1. **Edge crossings**: any proper crossing between an edge of A and an
 *    edge of B means the interiors overlap.
 * 2. **Containment**: if there are no edge crossings but A is fully inside
 *    B (or vice versa), at least one vertex of the contained polygon is
 *    strictly inside the container. We test both directions.
 */
const polygonsInteriorOverlap = (a: readonly PlanePoint[], b: readonly PlanePoint[]): boolean => {
  // 1. Proper edge crossings.
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i]
    const a2 = a[(i + 1) % a.length]
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j]
      const b2 = b[(j + 1) % b.length]
      if (segmentsCross(a1, a2, b1, b2)) return true
    }
  }
  // 2. Containment in either direction.
  if (a.some((p) => pointStrictlyInsidePolygon(p, b))) return true
  if (b.some((p) => pointStrictlyInsidePolygon(p, a))) return true
  return false
}

/**
 * High-level "is the in-progress polygon drawable / closeable?" check.
 * Returns null on valid, or a human-readable error message otherwise.
 *
 * Runs continuously while drawing so the user gets instant feedback —
 * cheaper than waiting until close attempt and then failing. The overlap
 * check against existing rooms only fires once we have at least 3
 * vertices (the minimum that defines a real polygon).
 */
export const validateInProgressPolygon = (
  vertices: readonly PlanePoint[],
  obstacles: readonly PolygonObstacle[] = [],
): string | null => {
  if (openPolylineSelfIntersection(vertices) !== null) {
    return "Polygon edges cross"
  }
  if (closingEdgeIntersectsPolyline(vertices)) {
    return "Closing edge would cross another edge"
  }
  if (vertices.length >= 3) {
    for (const obstacle of obstacles) {
      if (polygonsInteriorOverlap(vertices, obstacle.vertices)) {
        return `Overlaps with room ${obstacle.label}`
      }
    }
  }
  return null
}
