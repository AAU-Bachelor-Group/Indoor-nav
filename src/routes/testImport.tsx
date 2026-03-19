import { createFileRoute } from "@tanstack/react-router"

import ImportFloor from "@/components/importFloorForm"

const RouteComponent = () => {
  return <ImportFloor />
}

export const Route = createFileRoute("/testImport")({
  component: RouteComponent,
})