import { createServerFn } from "@tanstack/react-start"

import { getFloorPlans } from "./floorplan.server"

export const getFloorPlansData = createServerFn({ method: "GET" }).handler(async () => {
  return await getFloorPlans()
})
