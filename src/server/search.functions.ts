import { createServerFn } from "@tanstack/react-start"

import { getAllRooms } from "./search.server"

export const getAllRoomsFunction = createServerFn({ method: "GET" }).handler(async () => {
  return await getAllRooms()
})
