import { createFileRoute, Link } from "@tanstack/react-router"

import { FloorSelector } from "#/components/floor-selector"
import { RenderModeToggle } from "#/components/render-mode-toggle"
import { MapScene } from "#/components/threeJS/map-scene"
import { buttonVariants } from "#/components/ui/button"
import { SearchBar } from "#/components/ui/search-bar"
import { useIsLoggedIn } from "#/lib/auth-hooks"
import { MapProvider } from "#/lib/map-context"

const App = () => {
  const { isLoggedIn, isPending } = useIsLoggedIn()

  return (
    <MapProvider>
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
          type="fuzzysearch"
          onResultClick={(item) => {
          console.log("Selected:", item.title)
        }}
        />
        <MapScene />
        <div className="absolute flex flex-col gap-2 bottom-6 right-6 z-10">
          <FloorSelector />
          <RenderModeToggle />
        </div>
      </main>
    </MapProvider>
  )
}

export const Route = createFileRoute("/")({ component: App })
