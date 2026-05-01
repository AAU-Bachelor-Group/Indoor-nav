import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { RoomTypeBadge } from "#/components/ui/room-type-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import { ROOM_TYPES } from "#/lib/room-types"

import type { RoomType } from "#/generated/prisma/enums"
import type { ReactNode } from "react"

export interface FormValues {
  roomNumber: string
  displayName: string | undefined
  type: RoomType
}

export const requiredString = (label: string) => (value: string) =>
  value.trim() === "" ? `${label} is required` : undefined

export const PanelTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="p-4 pr-14">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
)

interface FieldWrapperProps {
  htmlFor: string
  label: string
  error?: string
  children: ReactNode
}

export const FieldWrapper = ({ htmlFor, label, error, children }: FieldWrapperProps) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {error !== undefined && <p className="text-xs text-destructive">{error}</p>}
  </div>
)

export const MutationErrorMessage = ({ error, fallback }: { error: unknown; fallback: string }) => {
  const message = error instanceof Error ? error.message : fallback
  return (
    <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
      {message}
    </p>
  )
}

interface RoomNumberFieldProps {
  id: string
  value: string
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
  invalid: boolean
}

export const RoomNumberField = ({
  id,
  value,
  error,
  onChange,
  onBlur,
  invalid,
}: RoomNumberFieldProps) => (
  <FieldWrapper htmlFor={id} label="Room number" error={error}>
    <Input
      id={id}
      className="bg-background text-black focus:ring-offset-2"
      placeholder="2.01"
      value={value}
      onChange={(e) => {
        onChange(e.target.value)
      }}
      onBlur={onBlur}
      aria-invalid={invalid}
    />
  </FieldWrapper>
)

interface DisplayNameFieldProps {
  id: string
  value: string | undefined
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
  invalid: boolean
}

export const DisplayNameField = ({
  id,
  value,
  error,
  onChange,
  onBlur,
  invalid,
}: DisplayNameFieldProps) => (
  <FieldWrapper htmlFor={id} label="Display name (optional)" error={error}>
    <Input
      id={id}
      className="bg-background text-black focus:ring-offset-2"
      placeholder="Project Lab"
      value={value}
      onChange={(e) => {
        onChange(e.target.value)
      }}
      onBlur={onBlur}
      aria-invalid={invalid}
    />
  </FieldWrapper>
)

interface RoomTypeFieldProps {
  id: string
  value: RoomType
  onChange: (value: RoomType) => void
}

export const RoomTypeField = ({ id, value, onChange }: RoomTypeFieldProps) => (
  <FieldWrapper htmlFor={id} label="Room type">
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(v)
      }}
    >
      <SelectTrigger className="w-full bg-background text-black">
        <SelectValue>
          {(v) =>
            typeof v === "string" && v !== "" ? <RoomTypeBadge type={v as RoomType} /> : null
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background text-black">
        {ROOM_TYPES.map((t) => (
          <SelectItem className="focus:bg-sidebar-primary/40 cursor-pointer" key={t} value={t}>
            <RoomTypeBadge type={t} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </FieldWrapper>
)
