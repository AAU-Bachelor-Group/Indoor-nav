import { createServerFn } from "@tanstack/react-start"

import { getAllRooms } from "./search.server"

export const getAllRoomsFunction = createServerFn().handler(async () => {
  return await getAllRooms()
})
