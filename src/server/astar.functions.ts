import { createServerFn } from "@tanstack/react-start"

import { AstarInputSchema } from "#/types/navigation"

import { astarWithMetrics } from "./astar.metrics.server"

export const astarFunction = createServerFn({ method: "GET" })
  .inputValidator(AstarInputSchema)
  .handler(async ({ data }) => {
    return await astarWithMetrics(data.profile, data.dest, data.start)
  })
