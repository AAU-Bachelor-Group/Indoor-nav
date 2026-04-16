import {
  BookMarked,
  BookOpen,
  Briefcase,
  Building2,
  GraduationCap,
  Presentation,
  UtensilsCrossed,
  Users,
  Wrench,
} from "lucide-react"

import { RoomType } from "#/generated/prisma/enums"

import type { LucideIcon } from "lucide-react"

interface RoomTypeMeta {
  label: string
  /** Fill color (hex). The outline color is derived from this. */
  color: string
  icon: LucideIcon
}

export const ROOM_TYPE_META: Record<RoomType, RoomTypeMeta> = {
  DEFAULT: { label: "Default", color: "#94a3b8", icon: Building2 },
  CLASSROOM: { label: "Classroom", color: "#fbbf24", icon: GraduationCap },
  MEETING_ROOM: { label: "Meeting room", color: "#60a5fa", icon: Users },
  OFFICE: { label: "Office", color: "#cbd5e1", icon: Briefcase },
  STUDY_SPACE: { label: "Study space", color: "#86efac", icon: BookOpen },
  AUDITORIUM: { label: "Auditorium", color: "#a78bfa", icon: Presentation },
  LIBRARY: { label: "Library", color: "#d6a878", icon: BookMarked },
  FOOD_DRINK: { label: "Food & drink", color: "#fb923c", icon: UtensilsCrossed },
  FACILITY: { label: "Facility", color: "#9ca3af", icon: Wrench },
}

export const ROOM_TYPES = Object.keys(ROOM_TYPE_META) as RoomType[]

export const getRoomTypeMeta = (type: RoomType): RoomTypeMeta => ROOM_TYPE_META[type]

/**
 * Scales each RGB channel toward black. `amount` is the fraction of the
 * channel to remove (0 = unchanged, 1 = black). Used to derive a room's
 * outline color from its fill.
 */
export const darkenHex = (hex: string, amount = 0.55): string => {
  const num = Number.parseInt(hex.slice(1), 16)
  const factor = 1 - amount
  const r = Math.round(((num >> 16) & 0xff) * factor)
  const g = Math.round(((num >> 8) & 0xff) * factor)
  const b = Math.round((num & 0xff) * factor)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

export const getRoomTypeOutline = (type: RoomType): string => darkenHex(ROOM_TYPE_META[type].color)
