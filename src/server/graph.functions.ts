import { createServerFn } from "@tanstack/react-start"

import { CreateEdgeSchema, EdgeIdSchema } from "#/types/edge"
import {
  CreateNodeSchema,
  CreateTransitNodesSchema,
  NodeIdSchema,
  UpdateNodeSchema,
} from "#/types/node"

import {
  activateNodeByIdInDb,
  addEdgeInDb,
  addNodeInDb,
  createTransitNodesInDb,
  deactiveNodeByIdInDb,
  deleteEdgeByIdInDb,
  deleteNodeByIdInDb,
  getAllEdgesInDb,
  getAllNodesInDb,
  updateNodeInDb,
} from "./graph.server"

export const getAllNodesData = createServerFn({ method: "GET" }).handler(async () => {
  return await getAllNodesInDb()
})

export const getAllEdgesData = createServerFn({ method: "GET" }).handler(async () => {
  return await getAllEdgesInDb()
})

export const updateNodeData = createServerFn({ method: "POST" })
  .inputValidator(UpdateNodeSchema)
  .handler(async ({ data }) => {
    return await updateNodeInDb(data.id, { type: data.type, x: data.x, y: data.y })
  })

export const addNodeData = createServerFn({ method: "POST" })
  .inputValidator(CreateNodeSchema)
  .handler(async ({ data }) => {
    return await addNodeInDb({
      x: data.x,
      y: data.y,
      z: data.z,
      type: data.type,
      isActivated: data.isActivated ?? true,
      room: data.roomId ? { connect: { id: data.roomId } } : undefined,
      floorPlan: { connect: { floor: data.floor } },
    })
  })

export const deleteNodeData = createServerFn({ method: "POST" })
  .inputValidator(NodeIdSchema)
  .handler(async ({ data }) => {
    return await deleteNodeByIdInDb(data.id)
  })

export const activateNodeData = createServerFn({ method: "POST" })
  .inputValidator(NodeIdSchema)
  .handler(async ({ data }) => {
    return await activateNodeByIdInDb(data.id)
  })

export const deactivateNodeData = createServerFn({ method: "POST" })
  .inputValidator(NodeIdSchema)
  .handler(async ({ data }) => {
    return await deactiveNodeByIdInDb(data.id)
  })

export const addEdgeData = createServerFn({ method: "POST" })
  .inputValidator(CreateEdgeSchema)
  .handler(async ({ data }) => {
    return await addEdgeInDb({
      distance: data.distance,
      isActivated: data.isActivated,
      fromNode: { connect: { id: data.fromNodeId } },
      toNode: { connect: { id: data.toNodeId } },
    })
  })

export const deleteEdgeData = createServerFn({ method: "POST" })
  .inputValidator(EdgeIdSchema)
  .handler(async ({ data }) => {
    return await deleteEdgeByIdInDb(data.id)
  })

export const createTransitNodesData = createServerFn({ method: "POST" })
  .inputValidator(CreateTransitNodesSchema)
  .handler(async ({ data }) => {
    return await createTransitNodesInDb({
      x: data.x,
      y: data.y,
      type: data.type,
      floors: data.floors,
      isActivated: data.isActivated ?? true,
    })
  })
