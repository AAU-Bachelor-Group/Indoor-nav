import { useQuery } from "@tanstack/react-query"

import { RoomCreatePanel } from "#/components/panels/room/room-create-panel"
import { RoomEditPanel } from "#/components/panels/room/room-edit-panel"
import { useMap } from "#/lib/map-context"
import { getAllRoomsData } from "#/server/room.functions"

/**
 * Dispatcher for the room admin panels:
 * - `editingRoomId` set → edit existing room (`RoomEditPanel`).
 * - `drawing.closed` (a draw-room polygon was just closed) → create
 *   (`RoomCreatePanel`).
 *
 * The two flows are mutually exclusive at the context level.
 */
export const RoomPanels = () => {
  const { drawing, editingRoomId } = useMap()

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
    enabled: editingRoomId !== null,
  })
  const editingRoom = editingRoomId ? (rooms.find((r) => r.id === editingRoomId) ?? null) : null

  if (editingRoom) return <RoomEditPanel key={editingRoom.id} room={editingRoom} />
  if (drawing.closed) return <RoomCreatePanel />
  return null
}
