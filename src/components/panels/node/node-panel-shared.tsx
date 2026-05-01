import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"

import type { NodeType } from "#/generated/prisma/enums"
import type { ReactNode } from "react"

export const NODE_TYPE_LABELS: Record<string, string> = {
  DEFAULT: "Default",
  DOOR: "Door",
  STAIR: "Stair",
  ELEVATOR: "Elevator",
  ENDPOINT: "Endpoint",
}

export const NODE_TYPES: NodeType[] = ["DEFAULT", "DOOR", "STAIR", "ELEVATOR", "ENDPOINT"]
export const TRANSIT_TYPES = new Set<NodeType>(["STAIR", "ELEVATOR"])
export const FLOOR_HEIGHT_METERS = 3.25

export const PanelTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="p-4 pr-14">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
)

export const FieldWrapper = ({
  htmlFor,
  label,
  error,
  children,
}: {
  htmlFor: string
  label: string
  error?: string
  children: ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {error !== undefined && <p className="text-xs text-destructive">{error}</p>}
  </div>
)

export const DetailRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-2">
    <Label>{label}</Label>
    <span className="text-sm">{value}</span>
  </div>
)

export const MutationError = ({ error, fallback }: { error: unknown; fallback: string }) => (
  <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
    {error instanceof Error ? error.message : fallback}
  </p>
)

interface CoordinateInputsProps {
  idPrefix: string
  xText: string
  yText: string
  onXChange: (text: string, parsed: number | null) => void
  onYChange: (text: string, parsed: number | null) => void
}

export const CoordinateInputs = ({
  idPrefix,
  xText,
  yText,
  onXChange,
  onYChange,
}: CoordinateInputsProps) => (
  <div className="flex gap-2">
    <div className="flex flex-1 flex-col gap-1.5">
      <Label htmlFor={`${idPrefix}-x`}>X</Label>
      <Input
        id={`${idPrefix}-x`}
        className="bg-background text-black focus:ring-offset-2"
        value={xText}
        onChange={(e) => {
          const v = Number.parseFloat(e.target.value)
          onXChange(e.target.value, Number.isNaN(v) ? null : v)
        }}
      />
    </div>
    <div className="flex flex-1 flex-col gap-1.5">
      <Label htmlFor={`${idPrefix}-y`}>Y</Label>
      <Input
        id={`${idPrefix}-y`}
        className="bg-background text-black focus:ring-offset-2"
        value={yText}
        onChange={(e) => {
          const v = Number.parseFloat(e.target.value)
          onYChange(e.target.value, Number.isNaN(v) ? null : v)
        }}
      />
    </div>
  </div>
)

interface NodeTypeSelectProps {
  id: string
  value: NodeType
  onChange: (type: NodeType) => void
}

export const NodeTypeSelect = ({ id, value, onChange }: NodeTypeSelectProps) => (
  <FieldWrapper htmlFor={id} label="Node type">
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v)
      }}
    >
      <SelectTrigger className="w-full bg-background text-black">
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent className="bg-background text-black">
        {NODE_TYPES.map((t) => (
          <SelectItem className="focus:bg-sidebar-primary/40 cursor-pointer" key={t} value={t}>
            {NODE_TYPE_LABELS[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </FieldWrapper>
)
