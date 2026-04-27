import { createFileRoute, Link } from "@tanstack/react-router"

import { ActionBar } from "#/components/map/action-bar/action-bar"
import { FuzzySearchBar } from "#/components/map/search/fuzzy-search-bar"
import { ToolPalette } from "#/components/map/tool-palette/tool-palette"
import { Compass } from "#/components/map/user-tools/compass"
import { DebugToggle } from "#/components/map/user-tools/debug-toggle"
import { FloorSelector } from "#/components/map/user-tools/floor-selector"
import { RenderModeToggle } from "#/components/map/user-tools/render-mode-toggle"
import { RoomOverlayToggle } from "#/components/map/user-tools/room-overlay-toggle"
import { EdgeMetadataPanel } from "#/components/panels/edge-metadata-panel"
import { NodeMetadataPanel } from "#/components/panels/node-metadata-panel"
import { RoomInfoPanel } from "#/components/panels/room-info-panel"
import { RoomMetadataPanel } from "#/components/panels/room-metadata-panel"
import { MapScene } from "#/components/threeJS/map-scene"
import { buttonVariants } from "#/components/ui/button"
import { TooltipProvider } from "#/components/ui/tooltip"
import { useIsLoggedIn } from "#/lib/auth-hooks"
import { MapProvider } from "#/lib/map-context"

const App = () => {
  const { isLoggedIn, isPending } = useIsLoggedIn()

  return (
    <TooltipProvider>
      <MapProvider>
        <main className="w-screen h-screen overflow-y-hidden">
          {!isPending &&
            (isLoggedIn ? (
              <>
                <Link
                  className={`${buttonVariants({ variant: "default" })} absolute top-6 left-130 z-100`}
                  to="/manage-floor"
                >
                  Manage
                </Link>
                <ToolPalette className="absolute left-6 top-1/2 -translate-y-1/2 z-10" />
                <ActionBar className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10" />
                <RoomMetadataPanel />
                <NodeMetadataPanel />
                <EdgeMetadataPanel />
              </>
            ) : null)}
          <FuzzySearchBar />
          <MapScene />
          <RoomInfoPanel />
          <div className="absolute flex flex-col gap-2 bottom-6 right-6 z-10">
            {isLoggedIn && <DebugToggle />}
            <RoomOverlayToggle />
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
