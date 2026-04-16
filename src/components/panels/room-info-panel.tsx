import { useQuery } from "@tanstack/react-query"
import { MapPin, Navigation as NavigationIcon, X } from "lucide-react"

import { Button } from "#/components/ui/button"
import { RoomTypeBadge } from "#/components/ui/room-type-badge"
import { useMap } from "#/lib/map-context"
import { cn } from "#/lib/utils"
import { getAllRoomsData } from "#/server/room.functions"

import type { PersistedRoom } from "#/server/room.server"
import type { ReactNode } from "react"

/**
 * PersistedRoom today only has `roomNumber/displayName/type/floor/vertices`,
 * but the UI contract the user is designing to includes an address, faculty,
 * and department. The panel reads them optionally so the view works now and
 * lights up automatically when the schema gains them.
 */
type RoomView = PersistedRoom & {
  address?: string
  faculty?: string
  department?: string
}

const DetailRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium uppercase tracking-wide text-popover-foreground/60">
      {label}
    </span>
    <span className="text-sm text-popover-foreground">{value}</span>
  </div>
)

interface RoomInfoBodyProps {
  room: RoomView
  onClose: () => void
}

const RoomInfoBody = ({ room, onClose }: RoomInfoBodyProps) => (
  <div className="flex h-full flex-col text-popover-foreground">
    <header className="flex items-start justify-between gap-3 p-5 pb-3">
      <div className="flex flex-col gap-2">
        <RoomTypeBadge type={room.type} variant="pill" />
        <h2 className="text-3xl font-bold leading-tight">{room.roomNumber}</h2>
        <p className="text-base text-popover-foreground/80">{room.displayName}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close"
        onClick={onClose}
        className="text-popover-foreground hover:bg-white/10 hover:text-popover-foreground"
      >
        <X />
      </Button>
    </header>

    <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-4">
      {room.address !== undefined && <DetailRow label="Address" value={room.address} />}
      {room.faculty !== undefined && <DetailRow label="Faculty" value={room.faculty} />}
      {room.department !== undefined && <DetailRow label="Department" value={room.department} />}
      <DetailRow
        label="Floor"
        value={
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5 text-popover-foreground/60" />
            {room.floor}
          </span>
        }
      />
    </div>

    <footer className="mt-auto flex flex-col gap-2 border-t border-white/10 p-5">
      <Button type="button" className="gap-2">
        <NavigationIcon className="size-4" />
        Start navigation
      </Button>
    </footer>
  </div>
)

/**
 * End-user room info.
 *
 * Responsive layout (single DOM, swapped with Tailwind breakpoints):
 * - **mobile (< md):** bottom-anchored drawer, slides up from the edge.
 * - **desktop (≥ md):** right-anchored side panel, slides in from the right.
 *
 * Non-modal in both shapes — the map stays visible and interactive behind
 * it, matching how `RoomMetadataPanel` behaves for the admin edit flow.
 */
export const RoomInfoPanel = () => {
  const { viewingRoomId, setViewingRoomId } = useMap()

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
    enabled: viewingRoomId !== null,
  })
  const room = (viewingRoomId ? rooms.find((r) => r.id === viewingRoomId) : null) as
    | RoomView
    | null
    | undefined

  const open = room != null

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed z-30 bg-popover text-popover-foreground shadow-2xl transition-transform duration-300 ease-in-out",
        // mobile: bottom sheet
        "inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl border-t border-border",
        // desktop: right side panel
        "md:inset-x-auto md:bottom-auto md:top-0 md:right-0 md:h-full md:max-h-none md:w-96 md:rounded-t-none md:border-t-0 md:border-l",
        open
          ? "translate-y-0 md:translate-x-0"
          : "translate-y-full md:translate-y-0 md:translate-x-full pointer-events-none",
      )}
    >
      {room && (
        <RoomInfoBody
          room={room}
          onClose={() => {
            setViewingRoomId(null)
          }}
        />
      )}
    </aside>
  )
}
