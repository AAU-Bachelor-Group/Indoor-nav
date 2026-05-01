import { getRoomTypeMeta, getRoomTypeOutline } from "#/lib/room-types"

import type { SearchResultItem } from "#/components/ui/search-result-list"
import type { NavigationRequest } from "#/lib/navigation-context"
import type { PersistedRoom } from "#/server/room.server"

/** Visual separator between roomNumber and displayName in inline labels. */
const ROOM_LABEL_SEPARATOR = "·"

type RoomLabelInput = Pick<PersistedRoom, "roomNumber" | "displayName">

/**
 * Single-line room label for inline display (field values, badges, summaries).
 * Renders as `"<roomNumber> · <displayName>"` when both exist, otherwise
 * just `"<roomNumber>"`.
 */
export const formatRoomLabel = (room: RoomLabelInput): string =>
  room.displayName
    ? `${room.roomNumber} ${ROOM_LABEL_SEPARATOR} ${room.displayName}`
    : room.roomNumber

/**
 * Single-line label for any value the navigation flow can carry as start or
 * destination. Renders as:
 * - Room → `formatRoomLabel(room)`
 * - Node → `"Node <first 6 chars of id>"` (graph node picked on the map)
 * - Bare coords → `"<x>, <y> (floor <floor>)"` (free pick on the floor plan)
 *
 * Returns `""` for `null` so it can be dropped straight into a controlled
 * input value.
 */
export const formatNavigationValue = (value: NavigationRequest["start"] | null): string => {
  if (!value) return ""
  if ("roomNumber" in value) return formatRoomLabel(value)
  if ("id" in value) return `Node ${value.id.slice(0, 6)}`
  return `${value.x.toFixed(2)}, ${value.y.toFixed(2)} (floor ${value.floor})`
}

export type RoomSearchResultItem = SearchResultItem & { dbId: string }

/**
 * Build a SearchResultList row from a persisted room. The row renders as:
 * - Circular icon badge filled with the room type's pastel color and
 *   outlined in its darkened variant (see room-types.ts).
 * - Primary text: `roomNumber`, followed by ` • displayName` when present
 *   (the join is done by SearchResultList).
 * - Secondary text: the human-readable room type label (e.g. "Meeting room").
 *
 * `dbId` is attached so click handlers can look the room up by primary key
 * instead of re-deriving it from `roomNumber`.
 */
export const roomToSearchResultItem = (room: PersistedRoom): RoomSearchResultItem => {
  const meta = getRoomTypeMeta(room.type)
  const outline = getRoomTypeOutline(room.type)
  const Icon = meta.icon
  return {
    id: room.roomNumber,
    icon: <Icon className="w-5 h-5" style={{ color: outline }} />,
    iconBgStyle: { backgroundColor: meta.color, outline: `2px solid ${outline}` },
    title: room.displayName ?? "",
    type: meta.label,
    dbId: room.id,
  }
}
