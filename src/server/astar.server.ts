import { MinPriorityQueue } from "@datastructures-js/priority-queue"

import { getGraph } from "./graph.server"

import type { Edge, Node } from "#/generated/prisma/client"
import type { AstarInput } from "#/types/navigation"

const TURN_PENALTY = 1
const TURN_ANGLE_THRESHOLD = 30 // degrees

const graph = await getGraph()

const findClosestNode = async (x: number, y: number, z: number): Promise<Node | null> => {
  const graph = await getGraph()
  const candidates = graph.getNodesByFloor(z)

  let closest: Node | null = null
  let minDist = Infinity

  for (const node of candidates) {
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

  return Math.hypot(node.x - target.x, node.y - target.y, node.z - target.z) + turnPenalty
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
  // If start position is a node
  let firstNode: Node
  if ("id" in start) {
    firstNode = start
  } else {
    // If start position is not a node, find the closest node to the start position
    const closest = await findClosestNode(start.x, start.y, start.floor)
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
