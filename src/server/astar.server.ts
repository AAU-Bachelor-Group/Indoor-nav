import type { AstarInput } from "./astar.functions"
import type { Node } from "#/generated/prisma/client"
import { getGraph } from "./graph.server"

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

const reconstructPath = (
  parent: Map<string, string>,
  t: string,
  nodes: Map<string, Node>,
): Node[] => {
  const path: Node[] = [nodes.get(t)!]
  while (parent.has(t)) {
    t = parent.get(t)!
    path.unshift(nodes.get(t)!)
  }
  return path
}

export const astar = async (
  profile: AstarInput["profile"],
  dest: AstarInput["dest"],
  start: AstarInput["start"],
) => {
  // If start position is a node
  let firstNode: Node
  if ("id" in start) {
    // If start node is also end node
    if (start.id === dest.id) {
      return [start]
    }
    firstNode = start as Node
  } else {
    // If start position is not a node, find the closest node to the start position
    const closest = await findClosestNode(start.x, start.y, start.z)
    if (!closest) return null
    firstNode = closest
  }

  // open: priority queue ordered by ascending f-value, where f(v) = g[v] + h(v)
  const open = new Set<string>()
  const closed = new Set<string>()
  // g: best known cost from start to v, default is infinity
  const g = new Map<string, number>()
  const parent = new Map<string, string>()

  g.set(firstNode.id, 0)
  open.add(firstNode.id) // insert s with priority h(s)

  let current: Node | null = null

  const graph = await getGraph()

  while (open.size > 0) {
    const currentId = open.values().next().value as string // node in open with lowest f-value
    open.delete(currentId)
    current = graph.nodes.get(currentId) ?? null

    if (current && dest.nodes.some((n) => n.id === current.id)) {
      return reconstructPath(parent, current.id, graph.nodes)
    }

    if (current) closed.add(current.id) // add current to closed
  }
}
