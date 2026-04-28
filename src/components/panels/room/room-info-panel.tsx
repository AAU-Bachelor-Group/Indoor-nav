import { useQuery } from "@tanstack/react-query"
import { MapPin, Navigation as NavigationIcon } from "lucide-react"

import { Panel } from "#/components/panels/panel"
import { Button } from "#/components/ui/button"
import { RoomTypeBadge } from "#/components/ui/room-type-badge"
import { useMap } from "#/lib/map-context"
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

const RoomInfoHeader = ({ room }: { room: RoomView }) => (
  <div className="flex flex-col gap-2 p-5 pr-14 pb-3">
    <RoomTypeBadge type={room.type} variant="pill" />
    <h2 className="text-3xl leading-tight font-bold">{room.roomNumber}</h2>
    <p className="text-base text-popover-foreground/80">{room.displayName}</p>
  </div>
)

const RoomInfoBody = ({ room }: { room: RoomView }) => (
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
)

const RoomInfoFooter = () => (
  <div className="flex flex-col gap-2 border-t border-white/10 p-5">
    <Button type="button" className="gap-2">
      <NavigationIcon className="size-4" />
      Start navigation
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

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
    enabled: viewingRoomId !== null,
  })
  const room = viewingRoomId ? (rooms.find((r) => r.id === viewingRoomId) as RoomView) : null

  const open = room != null

  return (
    <Panel
      open={open}
      onClose={() => {
        setViewingRoomId(null)
      }}
      header={room && <RoomInfoHeader room={room} />}
      footer={<RoomInfoFooter />}
    >
      {room && <RoomInfoBody room={room} />}
    </Panel>
  )
}
