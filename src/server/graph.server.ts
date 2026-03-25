import { prisma } from "#/db"

import type { Node, Edge } from "#/generated/prisma/client"
import type { EdgeCreateInput, NodeCreateInput } from "#/generated/prisma/models"

let graph: Graph | null = null

export class Graph {
  nodes: Map<Node["id"], Node>
  adjacency: Map<Node["id"], Edge[]>

  // ----------------------------- //
  // Constructor
  // ----------------------------- //
  constructor(nodesArray: Node[], edgesArray: Edge[]) {
    this.nodes = new Map()
    this.adjacency = new Map()

    for (const node of nodesArray) {
      this.nodes.set(node.id, node)
      this.adjacency.set(node.id, [])
    }

    for (const edge of edgesArray) {
      this.addEdge(edge)
    }
  }

  // ----------------------------- //
  // Node operations
  // ----------------------------- //
  addNode(node: Node) {
    this.nodes.set(node.id, node)
    this.adjacency.set(node.id, [])
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

  activateNodeById(nodeId: Node["id"]) {
    const node = this.nodes.get(nodeId)
    if (!node) return
    node.isActivated = true
  }

  // ----------------------------- //
  // Edge oprations
  // ----------------------------- //
  deleteEdgeByNodeIds(idOne: Node["id"], idTwo: Node["id"]) {
    this._removeConnection(idOne, idTwo)
    this._removeConnection(idTwo, idOne)
  }

  deactiveEdgeByNodeIds(idOne: Node["id"], idTwo: Node["id"]) {
    const edges = this.adjacency.get(idOne)
    if (!edges) return

    for (const edge of edges) {
      if (edge.toNodeId === idTwo) {
        edge.isActivated = false
      }
    }

    // reverse direction
    const reverse = this.adjacency.get(idTwo)
    if (!reverse) return

    for (const edge of reverse) {
      if (edge.toNodeId === idOne) {
        edge.isActivated = false
      }
    }
  }

  activateEdgeByNodeIds(idOne: Node["id"], idTwo: Node["id"]) {
    const edges = this.adjacency.get(idOne)
    if (!edges) return

    for (const edge of edges) {
      if (edge.toNodeId === idTwo) {
        edge.isActivated = true
      }
    }

    const reverse = this.adjacency.get(idTwo)
    if (!reverse) return

    for (const edge of reverse) {
      if (edge.toNodeId === idOne) {
        edge.isActivated = true
      }
    }
  }

  addEdge(edge: Edge) {
    this._addOneWay(edge)

    const reverseEdge: Edge = {
      ...edge,
      fromNodeId: edge.toNodeId,
      toNodeId: edge.fromNodeId,
    }

    this._addOneWay(reverseEdge)
  }

  // ----------------------------- //
  // Get adjacent edges: A -> [A -> B, A -> C ... ]
  // ----------------------------- //
  getNeighbors(id: Node["id"]): Edge[] {
    return this.adjacency.get(id)?.filter((e) => e.isActivated) ?? []
  }

  // ----------------------------- //
  // Helpers
  // ----------------------------- //
  private _addOneWay(edge: Edge) {
    const fromId = edge.fromNodeId

    const list = this.adjacency.get(fromId) ?? []
    list.push(edge)
    this.adjacency.set(fromId, list)
  }

  private _removeConnection(fromId: string, toId: string) {
    const list = this.adjacency.get(fromId)
    if (!list) return

    this.adjacency.set(
      fromId,
      list.filter((e) => e.toNodeId !== toId),
    )
  }
}

// ----------------------------- //
// Functions for in memory singleton graph
// ----------------------------- //
export const initGraph = async () => {
  if (graph) return graph

  const nodes = await prisma.node.findMany()
  const edges = await prisma.edge.findMany()

  graph = new Graph(nodes, edges)

  return graph
}

// After init
export const getGraph = async (): Promise<Graph> => {
  if (!graph) {
    graph = await initGraph()
    console.log("Graph object did not exist in memory. Initialising...")
  }
  return graph
}

// ----------------------------- //
// Database operations
// ----------------------------- //

// Node db operations
export const addNodeInDb = async (node: NodeCreateInput) => {
  const created = await prisma.node.create({
    data: node,
  })

  const g = await getGraph()
  g.addNode(created)

  return created
}

export const deleteNodeByIdInDb = async (nodeId: Node["id"]) => {
  const deleted = await prisma.node.delete({
    where: { id: nodeId },
  })

  const g = await getGraph()
  g.deleteNodeById(nodeId)

  return deleted
}

export const activateNodeByIdInDb = async (nodeId: Node["id"]) => {
  const updated = await prisma.node.update({
    where: { id: nodeId },
    data: { isActivated: true },
  })

  const g = await getGraph()
  g.activateNodeById(nodeId)

  return updated
}

export const deactiveNodeByIdInDb = async (nodeId: Node["id"]) => {
  const updated = await prisma.node.update({
    where: { id: nodeId },
    data: { isActivated: false },
  })

  const g = await getGraph()
  g.deactivateNodeById(nodeId)

  return updated
}

// Edge db operations
export const addEdgeInDb = async (edge: EdgeCreateInput) => {
  const created = await prisma.edge.create({
    data: edge,
  })

  const g = await getGraph()
  g.addEdge(created)

  return created
}

export const deleteEdgeByIdInDb = async (edgeId: Edge["id"]) => {
  const deleted = await prisma.edge.delete({
    where: { id: edgeId },
  })

  const g = await getGraph()
  g.deleteEdgeByNodeIds(deleted.fromNodeId, deleted.toNodeId)

  return deleted
}

export const deactivateEdgeByIdinDb = async (edgeId: Edge["id"]) => {
  const updated = await prisma.edge.update({
    where: { id: edgeId },
    data: { isActivated: false },
  })

  const g = await getGraph()
  g.deactiveEdgeByNodeIds(updated.fromNodeId, updated.toNodeId)

  return updated
}

export const activateEdgeByIdInDb = async (edgeId: Edge["id"]) => {
  const updated = await prisma.edge.update({
    where: { id: edgeId },
    data: { isActivated: true },
  })

  const g = await getGraph()
  g.activateEdgeByNodeIds(updated.fromNodeId, updated.toNodeId)

  return updated
}
