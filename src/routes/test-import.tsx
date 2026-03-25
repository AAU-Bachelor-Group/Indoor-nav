import { createFileRoute, Link } from "@tanstack/react-router"

import ImportFloorForm from "../components/import-floor/import-floor-form"
import { buttonVariants } from "#/components/ui/button"

const RouteComponent = () => {
  return (
    <div>
      { /* for convinence again */}
      <div className="flex justify-center">
        <Link to="/" className={buttonVariants({ variant: "default" })}>
          Go back
        </Link>
      </div>

      <ImportFloorForm />
    </div>
  )
}

export const Route = createFileRoute("/test-import")({
  component: RouteComponent,
})
