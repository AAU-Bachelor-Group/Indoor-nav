import { createFileRoute } from '@tanstack/react-router'
import ImportFloor from '@/components/importFloorForm'

export const Route = createFileRoute('/testImport')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ImportFloor />
}

