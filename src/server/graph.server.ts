import { prisma } from "#/db"
import type { Node, Edge } from "#/generated/prisma/client"

let graph: Graph | null = null

export class Graph {
  nodes: Map<Node["id"], Node>
  adjacency: Map<Node["id"], Edge[]>

  constructor(nodesArray: Node[], edgesArray: Edge[]) {
    this.nodes = new Map()
    this.adjacency = new Map()

    // init nodes
    for (const node of nodesArray) {
      this.nodes.set(node.id, node)
      this.adjacency.set(node.id, [])
    }

    // IMPORTANT: use addEdge so logic is consistent
    for (const edge of edgesArray) {
      this.addEdge(edge)
    }
  }

  addNode(node: Node) {
    this.nodes.set(node.id, node)
    this.adjacency.set(node.id, [])
  }

  // UNDIRECTED EDGE INSERTION
  addEdge(edge: Edge) {
    this._addOneWay(edge)

    const reverseEdge: Edge = {
      ...edge,
      fromNodeId: edge.toNodeId,
      toNodeId: edge.fromNodeId,
    }

    this._addOneWay(reverseEdge)
  }

  private _addOneWay(edge: Edge) {
    if (!this.adjacency.has(edge.fromNodeId)) {
      this.adjacency.set(edge.fromNodeId, [])
    }

    this.adjacency.get(edge.fromNodeId)!.push(edge)
  }

  deleteNodeById(nodeId: Node["id"]) {
    // remove node
    this.nodes.delete(nodeId)
    this.adjacency.delete(nodeId)

    // remove all edges pointing to this node
    for (const [fromId, edges] of this.adjacency.entries()) {
      const filtered = edges.filter((e) => e.toNodeId !== nodeId)

      this.adjacency.set(fromId, filtered)
    }
  }

  deactivateNodeById(nodeId: Node["id"]) {
    const node = this.nodes.get(nodeId)
    if (!node) return
    node.isActivated = false
  }

  getNeighbors(id: Node["id"]): Edge[] {
    return this.adjacency.get(id)?.filter((e) => e.isActivated) ?? []
  }
}

/**
 * Initialize graph from database
 */
export const initGraph = async () => {
  const nodes = await prisma.node.findMany()
  const edges = await prisma.edge.findMany()

  if (graph) return graph

  graph = new Graph(nodes, edges)

  return graph
}

/**
 * Access the in-memory graph (after init)
 */
export const getGraph = () => {
  if (!graph) {
    throw new Error("Graph not initialized")
  }
  return graph
}
