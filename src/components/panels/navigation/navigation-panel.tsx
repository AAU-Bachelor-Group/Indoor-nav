/* eslint-disable @typescript-eslint/naming-convention */
import { AlertCircle, Loader2, RouteOff, WifiOff } from "lucide-react"
import { Fragment, useState } from "react"

import { useFuzzySearch } from "#/components/hooks/use-fuse"
import {
  DotConnector,
  FIELD_LABEL,
  FIELDS,
  PREFERENCE_OPTIONS,
  SELECT_ON_MAP_ITEM,
  type FieldConfig,
  type FieldKey,
} from "#/components/panels/navigation/navigation-panel-shared"
import { Panel } from "#/components/panels/panel"
import { Button } from "#/components/ui/button"
import { SearchField } from "#/components/ui/search-field"
import { SearchResultList, type SearchResultItem } from "#/components/ui/search-result-list"
import { Separator } from "#/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group"
import { useMap } from "#/lib/map-context"
import { useNavigation } from "#/lib/navigation-context"
import { pointStrictlyInsidePolygon } from "#/lib/polygon-validation"
import {
  formatNavigationValue,
  roomToSearchResultItem,
  type RoomSearchResultItem,
} from "#/lib/room-format"
import { astarFunction } from "#/server/astar.functions"
import { getRoomWithNodesData } from "#/server/room.functions"

import type { NavigationStart, RoutePreference } from "#/types/navigation"
import type { Node } from "#/types/node"
import type { Room } from "#/types/room"

/** UI-friendly classification for navigation failures. Drives copy + icon. */
type RouteErrorKind = "no-route" | "same-point" | "destination" | "network" | "unknown"

interface RouteError {
  kind: RouteErrorKind
  message: string
}

const ROUTE_ERROR_COPY: Record<RouteErrorKind, string> = {
  "no-route": "No route found between these points.",
  "same-point": "Start and destination are the same - pick a different destination.",
  destination: "Couldn't load destination details. Try again.",
  network: "Connection lost. Check your internet and try again.",
  unknown: "Something went wrong while finding a route. Please try again.",
}

const ROUTE_ERROR_ICON: Record<RouteErrorKind, typeof AlertCircle> = {
  "no-route": RouteOff,
  "same-point": AlertCircle,
  destination: AlertCircle,
  network: WifiOff,
  unknown: AlertCircle,
}

/**
 * True when the start point sits inside the destination room's polygon on
 * the same floor. Routing in this case would just walk from a point inside
 * the room to that room's own door, which is rarely what the user wants.
 *
 * Map y → world -z (the rest of the app uses the same flip; see
 * `mapPointToThree`), so we negate y when constructing the (x, z) probe.
 */
const isStartInsideDestinationRoom = (start: NavigationStart, destination: Room): boolean => {
  if (start.floor !== destination.floor) return false
  return pointStrictlyInsidePolygon({ x: start.x, z: -start.y }, destination.vertices)
}

/** Classify a thrown error into the smallest set of UX-relevant buckets. */
const classifyRouteError = (error: unknown): RouteError => {
  // `fetch` rejects with a TypeError("Failed to fetch") on network failure
  // (server unreachable, offline, DNS, blocked by extension). Distinguish it
  // from generic errors so we can give a useful suggestion.
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return { kind: "network", message: ROUTE_ERROR_COPY.network }
  }
  return { kind: "unknown", message: ROUTE_ERROR_COPY.unknown }
}

export const NavigationPanel = () => {
  const {
    start,
    destination,
    navigationPanelOpen,
    setNavigationPanelOpen,
    setStart,
    setDestination,
    preference,
    setPreference,
    activeField,
    setActiveField,
    pickRoomForActiveField,
    setNavigationPath,
  } = useNavigation()
  const { pickingStart, setPickingStart, setViewingRoomId, focusTarget, renderMode, currentFloor } =
    useMap()

  const [query, setQuery] = useState("")
  const [isComputing, setIsComputing] = useState(false)
  const [routeError, setRouteError] = useState<RouteError | null>(null)

  const { results, isLoading } = useFuzzySearch(query)

  // React to the open prop transitioning. Derived-state pattern (same as
  // Panel's height reset) — no effect needed.
  const [prevOpen, setPrevOpen] = useState(navigationPanelOpen)
  if (navigationPanelOpen !== prevOpen) {
    setPrevOpen(navigationPanelOpen)
    setActiveField(navigationPanelOpen && destination !== null && start === null ? "start" : null)
    setQuery("")
  }

  const fieldValue = (field: FieldKey) => (field === "start" ? start : destination)
  const clearField = (field: FieldKey) => {
    if (field === "start") setStart(null)
    else setDestination(null)
  }

  const focusField = (field: FieldKey) => {
    setActiveField(field)
    setQuery("")
    setRouteError(null)
  }

  const roomResults: RoomSearchResultItem[] =
    isLoading || activeField === null ? [] : results.map((r) => roomToSearchResultItem(r.item))

  const handlePickRoom = (item: SearchResultItem) => {
    const { dbId } = item as RoomSearchResultItem
    const room = results.find((r) => r.item.id === dbId)?.item
    if (!room) return
    pickRoomForActiveField(room)
    setQuery("")
  }

  const handleSelectOnMap = () => {
    setActiveField(null)
    setQuery("")
    setPickingStart(true)
  }

  const handleClose = () => {
    setNavigationPanelOpen(false)
    setStart(null)
    setDestination(null)
    setActiveField(null)
    setQuery("")
    setPickingStart(false)
    setRouteError(null)
  }

  const focusRouteToBounds = (path: Node[]) => {
    if (path.length === 0) return

    const floorNodes =
      renderMode === "3d" ? path : path.filter((node) => node.floor === currentFloor)

    const visibleNodes = floorNodes.length > 0 ? floorNodes : [path[0]]
    const minX = Math.min(...visibleNodes.map((node) => node.x))
    const maxX = Math.max(...visibleNodes.map((node) => node.x))
    const minY = Math.min(...visibleNodes.map((node) => node.y))
    const maxY = Math.max(...visibleNodes.map((node) => node.y))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const targetSpan = Math.max(maxX - minX, maxY - minY, 1) * 1.6

    focusTarget({
      x: centerX,
      y: centerY,
      floor: visibleNodes[0].floor,
      targetSpan,
    })
  }

  const handleStart = async () => {
    if (!start || !destination || !setNavigationPath) return

    if (isStartInsideDestinationRoom(start, destination)) {
      setRouteError({ kind: "same-point", message: ROUTE_ERROR_COPY["same-point"] })
      return
    }

    setIsComputing(true)
    setRouteError(null)
    // Keep the loading state up for at least this long so a fast response
    // doesn't cause the spinner to flash imperceptibly.
    const startedAt = performance.now()
    const minVisibleMs = 350

    try {
      const destinationWithNodes = await getRoomWithNodesData({
        data: { id: destination.id },
      })
      if (!destinationWithNodes) {
        setRouteError({ kind: "destination", message: ROUTE_ERROR_COPY.destination })
        return
      }

      const requestStart = performance.now()
      const path = await astarFunction({
        data: {
          profile: preference,
          start,
          dest: destinationWithNodes,
        },
      })
      const roundTripMs = performance.now() - requestStart
      console.warn(
        `[astar] round-trip ${roundTripMs.toFixed(2)}ms profile=${preference} pathLen=${path?.length ?? "null"}`,
      )

      // A* returns:
      // - `null` when the graph can't connect start to destination at all
      //   (disconnected graph, destination room has no DOOR/ENDPOINT, etc.)
      // - `[singleNode]` when start == destination, which is truthy but not
      //   a meaningful route. Treat both as user-visible failures rather
      //   than silently closing the panel.
      if (!path) {
        setRouteError({ kind: "no-route", message: ROUTE_ERROR_COPY["no-route"] })
        return
      }
      if (path.length < 2) {
        setRouteError({ kind: "same-point", message: ROUTE_ERROR_COPY["same-point"] })
        return
      }

      focusRouteToBounds(path)
      setNavigationPath(path)
      setNavigationPanelOpen(false)
      setViewingRoomId(destination.id)
    } catch (error) {
      console.error("Error finding route:", error)
      setRouteError(classifyRouteError(error))
    } finally {
      const elapsed = performance.now() - startedAt
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed))
      }
      setIsComputing(false)
    }
  }

  const canStart = start !== null && destination !== null
  const isMinimized = canStart && activeField === null

  const headerText = (() => {
    if (activeField !== null) return `Selecting ${FIELD_LABEL[activeField]} - pick a result below`
    if (canStart) return "Ready to go"
    return "Choose a start location and destination"
  })()

  const header = (
    <div className="flex flex-col gap-1 p-5 pr-14">
      <h2 className="text-2xl font-bold">Navigation</h2>
      <p className="text-sm text-popover-foreground/70">{headerText}</p>
    </div>
  )

  const RouteErrorIcon = routeError ? ROUTE_ERROR_ICON[routeError.kind] : null
  const footer = (
    <div className="flex flex-col gap-3 border-t border-white/10 p-4">
      {routeError && RouteErrorIcon && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <RouteErrorIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{routeError.message}</span>
        </div>
      )}
      <Button
        type="button"
        className="w-full"
        disabled={!canStart || isComputing}
        onClick={() => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          handleStart()
        }}
      >
        {isComputing ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Finding route...
          </>
        ) : (
          "Start"
        )}
      </Button>
    </div>
  )

  const renderField = ({ key, icon: Icon, placeholder, ariaLabel }: FieldConfig) => {
    const value = fieldValue(key)
    const isActive = activeField === key
    return (
      <SearchField
        leadingIcon={<Icon className="size-5 text-muted-foreground shrink-0" />}
        placeholder={placeholder}
        value={isActive ? query : formatNavigationValue(value)}
        active={isActive}
        onFocus={() => {
          focusField(key)
        }}
        onQueryChange={setQuery}
        onClear={
          value !== null && !isActive
            ? () => {
                clearField(key)
                setActiveField(key)
                setQuery("")
              }
            : undefined
        }
        inputAriaLabel={ariaLabel}
      />
    )
  }

  const emptyResultsMessage =
    query.trim().length === 0 ? "Start typing to search rooms" : "No matches"

  return (
    <Panel
      open={navigationPanelOpen && !pickingStart}
      // `full` while searching so the result list gets the whole sheet;
      // `auto` otherwise so the panel hugs its content (just the two
      // fields and toggle when you're picking, even tighter when you're
      // ready to start).
      size={activeField !== null ? "full" : "auto"}
      onClose={handleClose}
      header={header}
      footer={footer}
      snappedToCollapse={isMinimized}
    >
      {/*
        Direct children of the Panel body, which is itself a flex column.
        The fields stay fixed (`shrink-0`); the results section, when
        present, takes the remaining space and is the only thing that
        scrolls (`flex-1 min-h-0 overflow-y-auto`).
      */}
      <div className="shrink-0 flex flex-col gap-1 px-4 pb-4">
        {FIELDS.map((field, idx) => (
          <Fragment key={field.key}>
            {idx > 0 && <DotConnector />}
            {renderField(field)}
          </Fragment>
        ))}

        {/* Hide the route-preference toggle while a search is active so
            the results section gets that vertical space — particularly
            valuable on mobile with the keyboard up. */}
        {activeField === null && (
          <ToggleGroup
            aria-label="Routing preference"
            value={[preference]}
            onValueChange={(next) => {
              // Single-select: ignore the empty case (require one selected).
              const [picked] = next
              if (picked) setPreference(picked as RoutePreference)
            }}
            className="mt-4 w-full [&>button]:flex-1"
          >
            {PREFERENCE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value} size="sm" aria-label={label}>
                <Icon className="size-4" />
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      {activeField !== null && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Separator className="bg-white mx-4 my-2" />
          <div className="mx-2 pb-2">
            <div className="py-2 text-xs font-medium uppercase tracking-wide text-primary-foreground">
              Results for {FIELD_LABEL[activeField]}
            </div>

            {activeField === "start" && (
              <>
                <SearchResultList
                  items={[SELECT_ON_MAP_ITEM]}
                  onItemClick={handleSelectOnMap}
                  bare
                  className="bg-white"
                />
                <Separator />
              </>
            )}

            {roomResults.length > 0 ? (
              <SearchResultList
                items={roomResults}
                onItemClick={handlePickRoom}
                bare
                className="bg-white"
              />
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">{emptyResultsMessage}</div>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}
