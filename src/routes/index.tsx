import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"

import { Button, buttonVariants } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { authClient } from "#/lib/auth-client"
import { useIsLoggedIn } from "#/lib/auth-hooks"
import { getTodos } from "#/server/todo.functions"
import { ThreeScene } from "#/components/threeJS/map-scene"

const App = () => {
  const { data: todos } = useQuery({ queryKey: ["todos"], queryFn: getTodos })
  const { isLoggedIn, isPending } = useIsLoggedIn()
  const router = useRouter()

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <div className="flex justify-end">
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
            <Link to="/login" className={buttonVariants({ variant: "outline" })}>
              Admin Login
            </Link>
          ))}
      </div>
      {todos?.map((todo) => (
        <div key={todo.id}>
          <h1>{todo.title}</h1>
        </div>
      ))}
      <Input type="text" placeholder="Add a todo" />
      <div style={{ width: "100%", height: "600px" }}>
        <ThreeScene />
      </div>
    </main>
  )
}

export const Route = createFileRoute("/")({ component: App })
