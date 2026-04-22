import { SquareMousePointer, MousePointer2, Pencil, Waypoints } from "lucide-react"

import type { ActiveTool } from "#/lib/map-context"
import type { LucideIcon } from "lucide-react"

export type ToolId = Exclude<ActiveTool, null>

export interface ToolMeta {
  id: ToolId
  /** Short label shown in tooltips and as the inactive palette hint. */
  label: string
  /** Present-tense label shown in the action bar while the tool is active. */
  activeLabel: string
  icon: LucideIcon
}

/**
 * Single source of truth for the map's editing tools. The left-hand tool
 * palette iterates over this (filtered to what's wired) and the bottom
 * action bar reads from `getToolMeta` to label the current mode. Adding a
 * new tool = add an entry here, implement its actions component, done.
 */
export const TOOL_REGISTRY: ToolMeta[] = [
  { id: "default", label: "Map view", activeLabel: "Viewing map", icon: MousePointer2 },
  { id: "draw-room", label: "Draw room", activeLabel: "Drawing room", icon: Pencil },
  { id: "edit-room", label: "Edit rooms", activeLabel: "Editing rooms", icon: SquareMousePointer },
  { id: "draw-node", label: "Edit nodes", activeLabel: "Editing nodes", icon: Waypoints },
  {
    id: "connect-edge",
    label: "Connect edges",
    activeLabel: "Connecting edges",
    icon: Waypoints,
  },
]
const toolById = new Map(TOOL_REGISTRY.map((t) => [t.id, t]))

export const getToolMeta = (id: ToolId): ToolMeta => {
  const meta = toolById.get(id)
  if (!meta) throw new Error(`Unknown tool id: ${id}`)
  return meta
}
