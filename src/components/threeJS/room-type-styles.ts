import type { RoomType } from "#/generated/prisma/enums"

interface RoomTypeStyle {
  fill: string
  outline: string
}

/**
 * Color palette per room type.
 *
 * Outlines are intentionally pure red across the board for the development
 * iteration: floor plan rasters have black architectural walls, so a dark
 * outline disappears into them, and a bright red pops against both white
 * fill areas and the black wall lines. The per-type palette will arrive
 * with the production styling pass.
 */
const DEV_OUTLINE = "#ff0000"

export const ROOM_TYPE_STYLES: Record<RoomType, RoomTypeStyle> = {
  DEFAULT: { fill: "#94a3b8", outline: DEV_OUTLINE },
  CLASSROOM: { fill: "#fbbf24", outline: DEV_OUTLINE },
  MEETING_ROOM: { fill: "#60a5fa", outline: DEV_OUTLINE },
  OFFICE: { fill: "#cbd5e1", outline: DEV_OUTLINE },
  STUDY_SPACE: { fill: "#86efac", outline: DEV_OUTLINE },
  AUDITORIUM: { fill: "#a78bfa", outline: DEV_OUTLINE },
  LIBRARY: { fill: "#d6a878", outline: DEV_OUTLINE },
  FOOD_DRINK: { fill: "#fb923c", outline: DEV_OUTLINE },
  FACILITY: { fill: "#9ca3af", outline: DEV_OUTLINE },
}

/** Lookup helper — typed so consumers don't have to import the record directly. */
export const getRoomTypeStyle = (type: RoomType): RoomTypeStyle => ROOM_TYPE_STYLES[type]
