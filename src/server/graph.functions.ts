import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { NodeType } from "#/generated/prisma/enums"

import {
  getAllNodesInDb,
  getAllEdgesInDb,
  updateNodeTypeInDb,
  updateNodeInDb,
  addNodeInDb,
  deleteNodeByIdInDb,
  activateNodeByIdInDb,
  deactiveNodeByIdInDb,
  addEdgeInDb,
  deleteEdgeByIdInDb,
  deactivateEdgeByIdinDb,
  activateEdgeByIdInDb,
  createTransitNodesInDb,
} from "./graph.server"

export const nodeTypeEnum = z.enum(Object.values(NodeType) as [string, ...string[]])

export const getAllNodesData = createServerFn({ method: "GET" }).handler(async () => {
  return await getAllNodesInDb()
})

export const getAllEdgesData = createServerFn({ method: "GET" }).handler(async () => {
  return await getAllEdgesInDb()
})

const updateNodeTypeSchema = z.object({
  id: z.string().min(1),
  type: nodeTypeEnum,
})

export const updateNodeTypeData = createServerFn({ method: "POST" })
  .inputValidator(updateNodeTypeSchema)
  .handler(async ({ data }) => {
    return await updateNodeTypeInDb(data.id, data.type)
  })

const updateNodeSchema = z.object({
  id: z.string().min(1),
  type: nodeTypeEnum,
  x: z.number(),
  y: z.number(),
})

export const updateNodeData = createServerFn({ method: "POST" })
  .inputValidator(updateNodeSchema)
  .handler(async ({ data }) => {
    return await updateNodeInDb(data.id, { type: data.type, x: data.x, y: data.y })
  })

export const addNodeSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  type: nodeTypeEnum,
  floor: z.number().int(),
  isActivated: z.boolean().optional(),
  roomId: z.string().optional(),
})

export const nodeIdSchema = z.object({
  id: z.string().min(1),
})

export const addEdgeSchema = z.object({
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  distance: z.number().positive(),
  doors: z.boolean().optional(),
  stairs: z.boolean().optional(),
  elevators: z.boolean().optional(),
  isActivated: z.boolean().optional(),
})

export const edgeIdSchema = z.object({
  id: z.string().min(1),
})

export const addNodeData = createServerFn({ method: "POST" })
  .inputValidator(addNodeSchema)
  .handler(async ({ data }) => {
    return await addNodeInDb({
      x: data.x,
      y: data.y,
      z: data.z,
      type: data.type as NodeType,
      isActivated: data.isActivated ?? true,
      room: data.roomId ? { connect: { id: data.roomId } } : undefined,
      floorPlan: { connect: { floor: data.floor } },
    })
  })

export const deleteNodeData = createServerFn({ method: "POST" })
  .inputValidator(nodeIdSchema)
  .handler(async ({ data }) => {
    return await deleteNodeByIdInDb(data.id)
  })

export const activateNodeData = createServerFn({ method: "POST" })
  .inputValidator(nodeIdSchema)
  .handler(async ({ data }) => {
    return await activateNodeByIdInDb(data.id)
  })

export const deactivateNodeData = createServerFn({ method: "POST" })
  .inputValidator(nodeIdSchema)
  .handler(async ({ data }) => {
    return await deactiveNodeByIdInDb(data.id)
  })

export const addEdgeData = createServerFn({ method: "POST" })
  .inputValidator(addEdgeSchema)
  .handler(async ({ data }) => {
    return await addEdgeInDb({
      distance: data.distance,
      doors: data.doors,
      stairs: data.stairs,
      elevators: data.elevators,
      isActivated: data.isActivated,
      fromNode: { connect: { id: data.fromNodeId } },
      toNode: { connect: { id: data.toNodeId } },
    })
  })

export const deleteEdgeData = createServerFn({ method: "POST" })
  .inputValidator(edgeIdSchema)
  .handler(async ({ data }) => {
    return await deleteEdgeByIdInDb(data.id)
  })

export const deactivateEdgeData = createServerFn({ method: "POST" })
  .inputValidator(edgeIdSchema)
  .handler(async ({ data }) => {
    return await deactivateEdgeByIdinDb(data.id)
  })

export const activateEdgeData = createServerFn({ method: "POST" })
  .inputValidator(edgeIdSchema)
  .handler(async ({ data }) => {
    return await activateEdgeByIdInDb(data.id)
  })

const createTransitNodesSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  type: z.enum(["STAIR", "ELEVATOR"]),
  floors: z.array(z.number().int()).min(1),
  isActivated: z.boolean().optional(),
  roomId: z.string().optional(),
})

export const createTransitNodesData = createServerFn({ method: "POST" })
  .inputValidator(createTransitNodesSchema)
  .handler(async ({ data }) => {
    return await createTransitNodesInDb({
      x: data.x,
      y: data.y,
      z: data.z,
      type: data.type,
      floors: data.floors,
      isActivated: data.isActivated ?? true,
      roomId: data.roomId,
    })
  })
