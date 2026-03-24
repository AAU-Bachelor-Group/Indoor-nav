import handler, { createServerEntry } from "@tanstack/react-start/server-entry"
import { initGraph } from "./server/graph.server"

try {
  await initGraph()
  console.log("Graph initialized")
} catch (e) {
  console.error(e)
}

export default createServerEntry({
  async fetch(request) {
    return handler.fetch(request)
  },
})
