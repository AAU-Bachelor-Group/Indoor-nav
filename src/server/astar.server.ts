import { MinPriorityQueue } from "@datastructures-js/priority-queue"

import { prisma } from "#/db"

import { getGraph } from "./graph.server"

import type { Edge, Node } from "#/generated/prisma/client"
import type { AstarInput } from "#/types/navigation"

const TURN_PENALTY = 1
const TURN_ANGLE_THRESHOLD = 30 // degrees
const FLOOR_CHANGE_PENALTY = 5

const graph = await getGraph()

/**
 * Resolve a start coordinate to a graph node. Prefers a node inside the
 * room the point falls in, so routes don't "exit through the wall" via a
 * hallway node that happens to be geometrically nearer than the door.
 */
const findStartNode = async (x: number, y: number, z: number): Promise<Node | null> => {
  const graph = await getGraph()
  const floorNodes = graph.getNodesByFloor(z)
  if (floorNodes.length === 0) return null

  // 1. Find which room (if any) contains the point. ST_MakePoint takes
  //    (x, -y) to match the y-flip convention used elsewhere in the app
  //    (see graph.server.ts).
  const roomMatch = await prisma.$queryRaw<{ id: string }[]>`
    SELECT r.id FROM "Room" r
    WHERE r.floor = ${z}
      AND r.polygon IS NOT NULL
      AND ST_Contains(r.polygon, ST_MakePoint(${x}, ${-y}))
    LIMIT 1
  `
  const roomId = roomMatch[0]?.id ?? null

  // 2. Narrow the candidate pool to that room's nodes; fall back to the
  //    whole floor when the point isn't in a room or the room has no nodes.
  const inRoom = roomId ? floorNodes.filter((n) => n.roomId === roomId) : []
  const pool = inRoom.length > 0 ? inRoom : floorNodes

  // 3. Pick the geometrically nearest node from the chosen pool.
  let closest: Node | null = null
  let minDist = Infinity
  for (const node of pool) {
    const dist = Math.hypot(node.x - x, node.y - y)
    if (dist < minDist) {
      minDist = dist
      closest = node
    }
  }
  return closest
}

const reconstructPath = (parent: Map<Node, Node>, t: Node): Node[] => {
  const path: Node[] = [t]
  let current = t

  while (parent.has(current)) {
    const next = parent.get(current)

    if (!next) break

    current = next
    path.unshift(current)
  }

  return path
}

const heuristic = (
  node: Node,
  target: Node,
  profile: AstarInput["profile"],
  previousEdge?: Edge,
): number => {
  if (profile === "ACCESSIBLE" && node.type === "STAIR" && previousEdge) {
    const fromNode = graph.nodes.get(previousEdge.fromNodeId)
    if (fromNode && fromNode.floor !== node.floor) return Infinity
  }

  let turnPenalty = 0
  let floorPenalty = 0

  if (profile === "SIMPLE" && previousEdge) {
    const fromNode = graph.nodes.get(previousEdge.fromNodeId)
    const toNode = graph.nodes.get(previousEdge.toNodeId)
    if (fromNode && toNode) {
      const angle =
        Math.atan2(node.y - fromNode.y, node.x - fromNode.x) -
        Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x)
      const angleDeg = Math.abs((angle * 180) / Math.PI)
      turnPenalty = angleDeg > TURN_ANGLE_THRESHOLD ? TURN_PENALTY : 0
    }
  }

  if (previousEdge) {
    const fromNode = graph.nodes.get(previousEdge.fromNodeId)
    if (fromNode && fromNode.floor !== node.floor && node.floor === target.floor) {
      floorPenalty = FLOOR_CHANGE_PENALTY
    }
  }

  return (
    Math.hypot(node.x - target.x, node.y - target.y, node.z - target.z) + turnPenalty + floorPenalty
  )
}

const findDestinationNode = (destRoom: AstarInput["dest"], startNode: Node): Node | null => {
  const closest = (type: string): Node | null => {
    let bestNode: Node | null = null
    let bestDist = Infinity
    for (const n of destRoom.nodes) {
      if (n.type !== type) continue
      const dist = Math.hypot(n.x - startNode.x, n.y - startNode.y, n.z - startNode.z)
      if (dist < bestDist) {
        bestDist = dist
        bestNode = n
      }
    }
    return bestNode
  }

  return closest("ENDPOINT") ?? closest("DOOR")
}

// Algorithm based on pseudocode written in the report
export const astar = async (
  profile: AstarInput["profile"],
  dest: AstarInput["dest"],
  start: AstarInput["start"],
) => {
  const startedAt = performance.now()
  const result = await runAstar(profile, dest, start)
  const elapsedMs = performance.now() - startedAt
  console.warn(
    `[astar] ${elapsedMs.toFixed(2)}ms profile=${profile} pathLen=${result?.length ?? "null"}`,
  )
  return result
}

const runAstar = async (
  profile: AstarInput["profile"],
  dest: AstarInput["dest"],
  start: AstarInput["start"],
) => {
  // If start position is a node
  let firstNode: Node
  if ("id" in start) {
    firstNode = start
  } else {
    // If start position is not a node, resolve it to a graph node — preferring
    // nodes inside the room the start point falls in (typically the door).
    const closest = await findStartNode(start.x, start.y, start.floor)
    if (!closest) return null
    firstNode = closest
  }

  const destinationNode = findDestinationNode(dest, firstNode)
  if (!destinationNode) return null

  // If start node is also end node
  if (firstNode.id === destinationNode.id) return [firstNode]

  // --------------------------------
  // Start of algorithm
  // --------------------------------

  // open: priority queue ordered by ascending f-value, where f(v) = g[v] + h(v)
  const open = new MinPriorityQueue<{ node: Node; f: number }>({ compare: (a, b) => a.f - b.f })
  const closed = new Set<Node>()
  // g: best known cost from start to v, default is infinity
  const g = new Map<Node, number>()
  const parent = new Map<Node, Node>()

  g.set(firstNode, 0)

  // insert s with priority h(s)
  open.enqueue({ node: firstNode, f: heuristic(firstNode, destinationNode, profile) })

  while (!open.isEmpty()) {
    const dequeued = open.dequeue()
    if (!dequeued) break
    const current = dequeued.node // node in open with lowest f-value

    if (current.id === destinationNode.id) {
      return reconstructPath(parent, current)
    }

    closed.add(current) // add current to closed

    graph.getNeighbors(current.id).forEach((edge) => {
      const neighbor = graph.nodes.get(edge.toNodeId)
      if (!neighbor?.isActivated) return

      // g′ ← g[n] + w(n, n′)
      const candidateCost = (g.get(current) ?? Infinity) + edge.distance

      // case 1: If n′ is new if n′ ∉ closed and n′ ∉ open
      if (!closed.has(neighbor) && !open.contains(({ node: n }) => n.id === neighbor.id)) {
        g.set(neighbor, candidateCost) // g[n′] ← g′
        parent.set(neighbor, current) // parent[n′] ← n

        // update n′ priority in open to g′ + h(n′)
        open.enqueue({
          node: neighbor,
          f: candidateCost + heuristic(neighbor, destinationNode, profile, edge),
        })

        // case 2: cheaper path via n ... else if n′ ∈ open and g′ < g[n′] then
      } else if (
        open.contains(({ node: n }) => n.id === neighbor.id) &&
        candidateCost < (g.get(neighbor) ?? Infinity)
      ) {
        // g[n′] ← g′
        g.set(neighbor, candidateCost)

        // parent[n′] ← n
        parent.set(neighbor, current)

        // update n′ priority in open to g′ + h(n′)
        open.remove(({ node: n }) => n.id === neighbor.id)
        const h2 = heuristic(neighbor, destinationNode, profile, edge)
        open.enqueue({ node: neighbor, f: candidateCost + h2 })
      }
    })
  }
  return null
}
