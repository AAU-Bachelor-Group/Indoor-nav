import { astar } from "./astar.server"

import type { AstarInput, AstarMetrics, AstarResult } from "#/types/navigation"
import type { Node } from "#/types/node"

const TURN_ANGLE_THRESHOLD_DEG = 30

const segmentDistance = (a: Node, b: Node): number => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)

/** Smallest absolute angle in degrees between segments (a→b) and (b→c). */
const turnAngleDeg = (a: Node, b: Node, c: Node): number => {
  const raw = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x)
  // Wrap to (-π, π] without a loop: sin/cos round-trip is the canonical trick.
  const wrapped = Math.atan2(Math.sin(raw), Math.cos(raw))
  return Math.abs((wrapped * 180) / Math.PI)
}

const sumPathDistance = (path: Node[]): number => {
  let total = 0
  for (let i = 1; i < path.length; i++) total += segmentDistance(path[i - 1], path[i])
  return total
}

const countFloorTransitions = (path: Node[]): number => {
  let count = 0
  for (let i = 1; i < path.length; i++) if (path[i].floor !== path[i - 1].floor) count++
  return count
}

const countTurns = (path: Node[]): number => {
  let count = 0
  for (let i = 2; i < path.length; i++) {
    if (turnAngleDeg(path[i - 2], path[i - 1], path[i]) > TURN_ANGLE_THRESHOLD_DEG) count++
  }
  return count
}

const emptyMetrics = (durationMs: number): AstarMetrics => ({
  durationMs,
  pathDistance: null,
  floorTransitions: null,
  turns: null,
  detourRatio: null,
})

const metricsForPath = (path: Node[], durationMs: number): AstarMetrics => {
  const start = path.at(0)
  const end = path.at(-1)
  if (!start || !end) return emptyMetrics(durationMs)
  const pathDistance = sumPathDistance(path)
  const straight = segmentDistance(start, end)
  return {
    durationMs,
    pathDistance,
    floorTransitions: countFloorTransitions(path),
    turns: countTurns(path),
    detourRatio: pathDistance > 0 ? straight / pathDistance : null,
  }
}

/**
 * Calls `astar` and decorates the result with timing + path-quality metrics.
 * Nothing here touches the algorithm itself — all stats are derived from
 * wall-clock and the returned node list, so `astar.server.ts` stays pristine.
 */
export const astarWithMetrics = async (
  profile: AstarInput["profile"],
  dest: AstarInput["dest"],
  start: AstarInput["start"],
): Promise<AstarResult> => {
  const startedAt = performance.now()
  const path = await astar(profile, dest, start)
  const durationMs = performance.now() - startedAt

  const metrics =
    path && path.length > 1 ? metricsForPath(path, durationMs) : emptyMetrics(durationMs)

  console.warn(
    `[astar] ${durationMs.toFixed(2)}ms profile=${profile} pathLen=${path?.length ?? "null"}`,
  )
  return { path, metrics }
}
