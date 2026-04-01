import { createFileRoute, Link } from "@tanstack/react-router"
import { Building2, Coffee, GraduationCap, Train } from "lucide-react"

import { ThreeScene } from "#/components/threeJS/map-scene"
import { buttonVariants } from "#/components/ui/button"
import { SearchBar } from "#/components/ui/search-bar"
import { useIsLoggedIn } from "#/lib/auth-hooks"

import type { SearchResultItem } from "#/components/ui/search-result-list"

// To do: Delete
const ALL_RESULTS: SearchResultItem[] = [
  {
    id: "lecture-hall",
    icon: <GraduationCap className="w-5 h-5" />,
    title: "Building 101",
    semantic: "Software lecture room",
  },
  {
    id: "library",
    icon: <Building2 className="w-5 h-5" />,
    title: "Main Library",
    semantic: "University library",
  },
  {
    id: "station",
    icon: <Train className="w-5 h-5" />,
    title: "Central Station",
    semantic: "Train station",
  },
  {
    id: "coffee",
    icon: <Coffee className="w-5 h-5" />,
    title: "Campus Coffee",
    semantic: "Coffee shop",
  },
]

const App = () => {
  const { isLoggedIn, isPending } = useIsLoggedIn()

  return (
    <main className="w-screen h-screen overflow-y-hidden">
      {!isPending &&
        (isLoggedIn ? (
          // TO DO: Replace with toggle between different admin views
          <Link
            className={`${buttonVariants({ variant: "default" })} absolute top-4 left-200`}
            to="/manage-floor"
          >
            Temp: Manage floor link
          </Link>
        ) : null)}
      <SearchBar
        className="absolute top-4 left-30 z-10 w-90"
        placeholder="Search for rooms..."
        type="integrated"
        results={ALL_RESULTS}
      />

      <ThreeScene currentFloor={1} />
    </main>
  )
}

export const Route = createFileRoute("/")({ component: App })
