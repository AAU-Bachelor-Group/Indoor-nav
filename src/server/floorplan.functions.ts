import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { getFloorPlans, editFloorPlan } from "./floorplan.server"

export const floorPlanEditSchema = z.object({
  floor: z.number(),
  calibrationScale: z.number().optional(),
  path: z.string().optional(),
})

export const getFloorPlansData = createServerFn({ method: "GET" }).handler(async () => {
  return await getFloorPlans()
})

export const editFloorPlanData = createServerFn({ method: "POST" })
  .inputValidator(floorPlanEditSchema)
  .handler(async ({ data }) => {
    return await editFloorPlan(data.floor, data.calibrationScale, data.path)
  })
