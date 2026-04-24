import { createFileRoute, Link } from "@tanstack/react-router"
import { Building2 } from "lucide-react"
import { useState } from "react"

import { useFuzzySearch } from "#/components/hooks/use-fuse"
import { ActionBar } from "#/components/map/action-bar/action-bar"
import { ToolPalette } from "#/components/map/tool-palette/tool-palette"
import { Compass } from "#/components/map/user-tools/compass"
import { DebugToggle } from "#/components/map/user-tools/debug-toggle"
import { FloorSelector } from "#/components/map/user-tools/floor-selector"
import { RenderModeToggle } from "#/components/map/user-tools/render-mode-toggle"
import { NodeMetadataPanel } from "#/components/panels/node-metadata-panel"
import { RoomInfoPanel } from "#/components/panels/room-info-panel"
import { RoomMetadataPanel } from "#/components/panels/room-metadata-panel"
import { MapScene } from "#/components/threeJS/map-scene"
import { buttonVariants } from "#/components/ui/button"
import { SearchBar } from "#/components/ui/search-bar"
import { TooltipProvider } from "#/components/ui/tooltip"
import { useIsLoggedIn } from "#/lib/auth-hooks"
import { MapProvider } from "#/lib/map-context"

import type { SearchResultItem } from "#/components/ui/search-result-list"
import { getRoomTypeMeta, getRoomTypeOutline } from "#/lib/room-types"
import { FuzzySearchBar } from "#/components/map/search/fuzzy-search-bar"

const App = () => {
  const { isLoggedIn, isPending } = useIsLoggedIn()
  const [query, setQuery] = useState("")

  const { results, isLoading } = useFuzzySearch(query)

  const fuzzyResults: SearchResultItem[] = isLoading
    ? []
    : results.map((r) => {
        const meta = getRoomTypeMeta(r.item.type)
        const outline = getRoomTypeOutline(r.item.type)
        const Icon = meta.icon

        return {
          id: r.item.roomNumber,
          icon: <Icon className="w-5 h-5" style={{ color: outline }} />,
          iconBgStyle: { backgroundColor: meta.color, outline: `2px solid ${outline}` },
          title: r.item.displayName || "",
          type: meta.label,
        }
      })

  return (
    <TooltipProvider>
      <MapProvider>
        <main className="w-screen h-screen overflow-y-hidden">
          {!isPending &&
            (isLoggedIn ? (
              <>
                <Link
                  className={`${buttonVariants({ variant: "default" })} absolute top-4 left-200 z-100`}
                  to="/manage-floor"
                >
                  Temp: Manage floor link
                </Link>
                <ToolPalette className="absolute left-6 top-1/2 -translate-y-1/2 z-10" />
                <ActionBar className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10" />
                <RoomMetadataPanel />
                <NodeMetadataPanel />
              </>
            ) : null)}
{/*           <SearchBar
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
          /> */}
          <FuzzySearchBar />
          <MapScene />
          <RoomInfoPanel />
          <div className="absolute flex flex-col gap-2 bottom-6 right-6 z-10">
            {isLoggedIn && <DebugToggle />}
            <RenderModeToggle />
            <Compass />
            <FloorSelector />
          </div>
        </main>
      </MapProvider>
    </TooltipProvider>
  )
}

export const Route = createFileRoute("/")({ component: App })
