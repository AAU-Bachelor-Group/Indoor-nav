import {
  Building2,
  GraduationCap,
  Users,
  Briefcase,
  BookOpen,
  Presentation,
  BookMarked,
  UtensilsCrossed,
  Wrench,
  FlaskConical,
  DoorOpen,
  Sofa,
  Coffee,
  Landmark,
  Dumbbell,
  Archive,
  Printer,
  Shirt,
  Toilet,
  ShowerHead,
  Sparkles,
  Moon,
  Headphones,
  LifeBuoy,
  Truck,
  Trash2,
  ArrowUpDown,
  Layers,
  GitFork,
  ShieldCheck,
  Mic,
  TrendingUpDownIcon,
  Armchair,
  ConciergeBell,
  Toolbox,
  TriangleRight,
  Waves,
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
  DEFAULT: { label: "Default", color: "#64748b", icon: Building2 },

  // Workspace & education
  OFFICE: { label: "Office", color: "#0ea5e9", icon: Briefcase },
  SEMINAR_ROOM: { label: "Seminar room", color: "#fbbf24", icon: GraduationCap },
  GROUP_ROOM: { label: "Group room", color: "#a3e635", icon: Users },
  MEETING_ROOM: { label: "Meeting room", color: "#0051ff", icon: Armchair },
  LABORATORY: { label: "Laboratory", color: "#ef4444", icon: FlaskConical },
  AUDITORIUM: { label: "Auditorium", color: "#763dfc", icon: Presentation },
  STUDY_SPACE: { label: "Study space", color: "#009737", icon: BookOpen },
  VIBRATION_ROOM: { label: "Vibration room", color: "#fb7185", icon: Waves },
  SOUND_BOOTH: { label: "Sound booth", color: "#a78bfa", icon: Mic },
  QUIET_ROOM: { label: "Quiet room", color: "#c4b5fd", icon: Moon },

  // Common areas
  CORRIDOR: { label: "Corridor / hallway", color: "#94a3b8", icon: DoorOpen },
  LOUNGE: { label: "Lounge / common area", color: "#f97316", icon: Sofa },
  KITCHEN: { label: "Kitchen / kitchenette", color: "#fb923c", icon: Coffee },
  CANTEEN: { label: "Canteen / cafeteria", color: "#f59e0b", icon: UtensilsCrossed },
  ATRIUM: { label: "Atrium", color: "#71753b", icon: Landmark },
  RECEPTION: { label: "Reception", color: "#3b82f6", icon: ConciergeBell },
  LIBRARY: { label: "Library", color: "#b08968", icon: BookMarked },
  FITNESS: { label: "Fitness / gym", color: "#10b981", icon: Dumbbell },
  COVERED_AREA: { label: "Covered area", color: "#6b7280", icon: Layers },

  // Service & support
  TECHNICAL_ROOM: { label: "Technical room", color: "#52525b", icon: Wrench },
  STORAGE: { label: "Storage", color: "#a8a29e", icon: Archive },
  PRINT_ROOM: { label: "Print room", color: "#cbd5e1", icon: Printer },
  CLOAKROOM: { label: "Cloakroom", color: "#835f31", icon: Shirt },
  TOILET: { label: "Toilet / restroom", color: "#f7ed61", icon: Toilet },
  CHANGING_ROOM: { label: "Changing / bath", color: "#fb7185", icon: ShowerHead },
  CLEANING_ROOM: { label: "Cleaning room", color: "#f850ce", icon: Sparkles },
  IT_SUPPORT: { label: "IT support", color: "#00ff55", icon: Headphones },
  SERVICE_DESK: { label: "Service desk", color: "#bfff94", icon: LifeBuoy },
  FACILITY_SUPPORT: { label: "Facility support", color: "#78716c", icon: Toolbox },
  LOADING_DOCK: { label: "Loading dock", color: "#2b2b2b", icon: Truck },
  WASTE: { label: "Waste / sorting", color: "#71717a", icon: Trash2 },

  // Infrastructure
  ELEVATOR: { label: "Elevator", color: "#64748b", icon: ArrowUpDown },
  STAIRS: { label: "Stairs", color: "#94a3b8", icon: TrendingUpDownIcon },
  VESTIBULE: { label: "Vestibule / anteroom", color: "#e2e8f0", icon: DoorOpen },
  SHAFT: { label: "Shaft", color: "#475569", icon: GitFork },
  AIRLOCK: { label: "Airlock / sluice", color: "#474747", icon: ShieldCheck },
  RAMP: { label: "Ramp", color: "#cbd5e1", icon: TriangleRight },
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
