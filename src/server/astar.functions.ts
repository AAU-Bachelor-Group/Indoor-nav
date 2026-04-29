import { createServerFn } from "@tanstack/react-start"
import z from "zod"

import { RoomType } from "#/generated/prisma/enums"

import { astar } from "./astar.server"
import { nodeTypeEnum } from "./graph.functions"

const roomTypeEnum = z.enum(Object.values(RoomType) as [string, ...string[]])

const nodeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  type: nodeTypeEnum,
  isActivated: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  roomId: z.string().nullable(),
  floor: z.number().int(),
})

const xyzSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
})

const roomSchema = z.object({
  id: z.string(),
  roomNumber: z.string(),
  displayName: z.string().nullable(),
  isActivated: z.boolean(),
  type: roomTypeEnum,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  sectionId: z.string().nullable(),
  floor: z.number().int(),
  nodes: z.array(nodeSchema),
})

export const astarSchema = z.object({
  profile: z.enum(["ACCESIBLE_ROUTE", "SIMPLE_ROUTE", "FAST_ROUTE"]),
  dest: roomSchema,
  start: z.union([xyzSchema, nodeSchema]),
})

export type AstarInput = z.infer<typeof astarSchema>

export const astarFunction = createServerFn({ method: "GET" })
  .inputValidator(astarSchema)
  .handler(async ({ data }) => {
    return await astar(data.profile, data.dest, data.start)
  })
