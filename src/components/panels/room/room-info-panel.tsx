import { useQuery } from "@tanstack/react-query"
import { Layers, MapPin, Navigation as NavigationIcon, Route } from "lucide-react"

import { Panel } from "#/components/panels/panel"
import { Button } from "#/components/ui/button"
import { RoomTypeBadge } from "#/components/ui/room-type-badge"
import { useMap } from "#/lib/map-context"
import { useNavigation } from "#/lib/navigation-context"
import { getAllRoomsData } from "#/server/room.functions"

import { PREFERENCE_OPTIONS } from "../navigation/navigation-panel-shared"

import type { Room } from "#/types/room"

/**
 * `Room` today only has `roomNumber/displayName/type/floor/vertices`, but the
 * UI contract the user is designing to includes an address, faculty, and
 * department. The panel reads them optionally so the view works now and
 * lights up automatically when the schema gains them.
 */
type RoomView = Room & {
  address?: string
  faculty?: string
  department?: string
}

const WALKING_SPEED_M_PER_S = 1.4

const RoomInfoHeader = ({ room }: { room: RoomView }) => (
  <div className="flex flex-col gap-2 p-5 pr-14 pb-3">
    <RoomTypeBadge type={room.type} variant="pill" />
    <div className="flex w-full items-center justify-between mt-3">
      <h2 className="text-3xl leading-tight font-bold">{room.roomNumber}</h2>
      <p className="text-base text-popover-foreground/80">{room.displayName}</p>
      <div className="flex">
        <MapPin className="size-5 text-popover-foreground/60" />
        <span className="ml-1 text-sm text-popover-foreground/60">Floor {room.floor}</span>
      </div>
    </div>
  </div>
)

const RouteInfoBody = ({
  distance,
  floorChanges,
  routingProfile,
}: {
  distance: number
  floorChanges: number
  routingProfile: string
}) => {
  const preference = PREFERENCE_OPTIONS.find((o) => o.value === routingProfile)
  const PreferenceIcon = preference?.icon

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4">
      <div className="flex items-center gap-2">
        <Route className="size-4 text-popover-foreground/60" />
        <span className="text-sm text-popover-foreground">{distance.toFixed(0)} m</span>
      </div>
      <div className="flex items-center gap-2">
        <NavigationIcon className="size-4 text-popover-foreground/60" />
        <span className="text-sm text-popover-foreground">
          {Math.floor(distance / WALKING_SPEED_M_PER_S / 60)}m &nbsp;
          {Math.round((distance / WALKING_SPEED_M_PER_S) % 60)}s walk
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-popover-foreground/60" />
        <span className="text-sm text-popover-foreground">{floorChanges} floor change</span>
      </div>
      {preference && PreferenceIcon && (
        <div className="flex items-center gap-2">
          <PreferenceIcon className="size-4 text-popover-foreground/60" />
          <span className="text-sm text-popover-foreground">
            {preference.label} routing profile
          </span>
        </div>
      )}
    </div>
  )
}

const RoomInfoFooter = ({
  onStart,
  onStop,
  hasActivePath,
}: {
  onStart: () => void
  onStop: () => void
  hasActivePath: boolean
}) => (
  <div className="flex flex-col gap-2 border-t border-white/10 p-5">
    <Button
      type="button"
      className="gap-2"
      variant={hasActivePath ? "destructive" : "default"}
      onClick={hasActivePath ? onStop : onStart}
    >
      <NavigationIcon className="size-4" />
      {hasActivePath ? "Stop navigation" : "Choose as destination"}
    </Button>
  </div>
)

/**
 * End-user room info panel.
 *
 * - **Desktop:** right side panel.
 * - **Mobile:** bottom sheet — header + footer always visible, drag the
 *   handle up to reveal the body details.
 */
export const RoomInfoPanel = () => {
  const { viewingRoomId, setViewingRoomId } = useMap()
  const {
    setDestination,
    setNavigationPanelOpen,
    navigationPath,
    setNavigationPath,
    setStart,
    preference,
  } = useNavigation()

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
    enabled: viewingRoomId !== null,
  })
  const room = viewingRoomId ? (rooms.find((r: Room) => r.id === viewingRoomId) as RoomView) : null

  const hasActivePath = Boolean(navigationPath && navigationPath.length > 0)

  const pathStats = () => {
    if (!navigationPath) return null

    let distance = 0
    let floorChanges = 0

    for (let i = 1; i < navigationPath.length; i++) {
      const prev = navigationPath[i - 1]
      const curr = navigationPath[i]

      // Calculate distance using Euclidean formula
      const dx = curr.x - prev.x
      const dy = curr.y - prev.y
      distance += Math.sqrt(dx * dx + dy * dy)

      // Count floor changes
      if (curr.floor !== prev.floor) {
        floorChanges++
      }
    }

    return { distance, floorChanges }
  }

  const stats = pathStats()
  const open = room != null

  const handleStart = () => {
    if (!room) return
    setDestination(room)
    setViewingRoomId(null)
    setNavigationPanelOpen(true)
  }

  const handleStopNavigation = () => {
    // Clear the navigation path
    if (setNavigationPath) {
      setNavigationPath(undefined)
      setStart(null)
      setViewingRoomId(null)
      setNavigationPanelOpen(true)
    }
  }

  return (
    <Panel
      open={open}
      // Chrome-only by default — just the room header and the primary
      // action. When a route is active, the user drags up to reveal the
      // distance / time / floor change details.
      size="min"
      onClose={() => {
        setViewingRoomId(null)
        setNavigationPath?.(undefined)
        setStart(null)
        setDestination(null)
      }}
      header={room && <RoomInfoHeader room={room} />}
      footer={
        <RoomInfoFooter
          onStart={handleStart}
          onStop={handleStopNavigation}
          hasActivePath={hasActivePath}
        />
      }
    >
      {stats && (
        <RouteInfoBody
          distance={stats.distance}
          floorChanges={stats.floorChanges}
          routingProfile={preference}
        />
      )}
    </Panel>
  )
}
