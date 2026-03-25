import { createFileRoute, Link, useRouter } from "@tanstack/react-router"

import { ThreeScene } from "#/components/threeJS/map-scene"
import { Button, buttonVariants } from "#/components/ui/button"
import { authClient } from "#/lib/auth-client"
import { useIsLoggedIn } from "#/lib/auth-hooks"

const App = () => {
  const { isLoggedIn, isPending } = useIsLoggedIn()
  const router = useRouter()

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <div className="flex justify-center">
        {!isPending &&
          (isLoggedIn ? (
            <Button
              variant="outline"
              onClick={() => {
                void authClient.signOut().then(() => router.invalidate())
              }}
            >
              Sign out
            </Button>
          ) : (
            <Link to="/login" className={buttonVariants({ variant: "default" })}>
              Admin Login
            </Link>
          ))}
        {/* for convinence */}
        <Link to="/test-import" className={buttonVariants({ variant: "default" })}>
          Import floor plan
        </Link>
      </div>

      <div className="mx-auto w-full h-200 max-w-4xl rounded-lg border bg-popover p-6 mt-10">
        <ThreeScene currentFloor={1} />
      </div>
    </main>
  )
}

export const Route = createFileRoute("/")({ component: App })
