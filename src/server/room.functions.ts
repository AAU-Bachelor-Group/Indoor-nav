import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { ROOM_TYPES } from "../lib/room-types"

import { createRoom, deleteRoom, getAllRooms, updateRoomMetadata } from "./room.server"

const roomTypeEnum = z.enum(ROOM_TYPES)

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1).max(100),
  displayName: z.string().max(200).optional(),
  type: roomTypeEnum,
  floor: z.number().int(),
  vertices: z
    .array(
      z.object({
        x: z.number(),
        z: z.number(),
      }),
    )
    .min(3),
})

export const updateRoomMetadataSchema = z.object({
  id: z.string().min(1),
  roomNumber: z.string().min(1).max(100),
  displayName: z.string().max(200).optional(),
  type: roomTypeEnum,
})

export const deleteRoomSchema = z.object({
  id: z.string().min(1),
})

export const createRoomData = createServerFn({ method: "POST" })
  .inputValidator(createRoomSchema)
  .handler(async ({ data }) => {
    return await createRoom(data)
  })

export const getAllRoomsData = createServerFn({ method: "GET" }).handler(async () => {
  return await getAllRooms()
})

export const updateRoomMetadataData = createServerFn({ method: "POST" })
  .inputValidator(updateRoomMetadataSchema)
  .handler(async ({ data }) => {
    return await updateRoomMetadata(data)
  })

export const deleteRoomData = createServerFn({ method: "POST" })
  .inputValidator(deleteRoomSchema)
  .handler(async ({ data }) => {
    return await deleteRoom(data.id)
  })
