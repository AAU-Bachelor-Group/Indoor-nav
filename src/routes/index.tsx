import { createFileRoute, Link } from "@tanstack/react-router"
import { Building2 } from "lucide-react"
import { useState } from "react"

import { FloorSelector } from "#/components/floor-selector"
import { useFuzzySearch } from "#/components/hooks/use-fuse"
import { RenderModeToggle } from "#/components/render-mode-toggle"
import { MapScene } from "#/components/threeJS/map-scene"
import { buttonVariants } from "#/components/ui/button"
import { SearchBar } from "#/components/ui/search-bar"
import { useIsLoggedIn } from "#/lib/auth-hooks"
import { MapProvider } from "#/lib/map-context"

import type { SearchResultItem } from "#/components/ui/search-result-list"

const App = () => {
  const { isLoggedIn, isPending } = useIsLoggedIn()
  const [query, setQuery] = useState("")

  const { results, isLoading } = useFuzzySearch(query)

  const fuzzyResults: SearchResultItem[] = isLoading
    ? []
    : results.map((r) => ({
        id: r.item.id,
        icon: <Building2 className="w-5 h-5" />,
        title: r.item.semanticNames[0],
        semantic: r.item.semanticNames.slice(1).join(", "),
      }))

  return (
    <MapProvider>
      <main className="w-screen h-screen overflow-y-hidden">
        {!isPending &&
          (isLoggedIn ? (
            <Link
              className={`${buttonVariants({ variant: "default" })} absolute top-4 left-200`}
              to="/manage-floor"
            >
              Temp: Manage floor link
            </Link>
          ) : null)}
        <SearchBar
          className="absolute top-4 left-30 z-10 w-90"
          type="integrated"
          placeholder="Search locations..."
          value={query}
          onQueryChange={setQuery}
          onSearch={(q) => {
            console.log("Search:", q)
          }}
          results={fuzzyResults}
          onResultClick={(item) => {
            console.log("Selected:", item.title)
          }}
          showResultsWhenEmpty={true}
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
