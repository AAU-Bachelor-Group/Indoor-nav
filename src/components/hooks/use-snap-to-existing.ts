import { useCallback } from "react"

import type * as THREE from "three"

/**
 * Returns a snap function: given a candidate world-space point, returns the
 * nearest existing target within `radius` meters, or null if none are close
 * enough.
 *
 * Used for vertex-to-vertex snapping during polygon drawing (so adjacent
 * rooms can share corners exactly), and later for node reuse during edge
 * placement. Targets and radius are stable across renders unless they change.
 */
export const useSnapToExisting = (targets: readonly THREE.Vector3[], radius: number) => {
  return useCallback(
    (point: THREE.Vector3): THREE.Vector3 | null => {
      let best: THREE.Vector3 | null = null
      let bestDist = radius
      for (const t of targets) {
        const d = point.distanceTo(t)
        if (d < bestDist) {
          bestDist = d
          best = t
        }
      }
      return best
    },
    [targets, radius],
  )
}
