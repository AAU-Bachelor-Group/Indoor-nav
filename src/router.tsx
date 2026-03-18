import { QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"

import { routeTree } from "./routeTree.gen"

let context: { queryClient: QueryClient } | undefined

export function getContext() {
  context ??= { queryClient: new QueryClient() }
  return context
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    context: getContext(),

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
