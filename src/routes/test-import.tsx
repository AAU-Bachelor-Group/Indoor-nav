import { createFileRoute } from "@tanstack/react-router"

import ImportFloorForm from "../components/import-floor/import-floor-form"

const RouteComponent = () => {
  return <ImportFloorForm />
}

export const Route = createFileRoute("/test-import")({
  component: RouteComponent,
})
