import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2, X } from "lucide-react"
import { useState } from "react"

import { Button } from "#/components/ui/button"
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
import { useMap } from "#/lib/map-context"
import { ROOM_TYPES } from "#/lib/room-types"
import { cn } from "#/lib/utils"
import {
  createRoomData,
  deleteRoomData,
  getAllRoomsData,
  updateRoomMetadataData,
} from "#/server/room.functions"

import type { RoomType } from "#/generated/prisma/enums"
import type { PersistedRoom } from "#/server/room.server"
import type { ReactNode } from "react"

const requiredString = (label: string) => (value: string) =>
  value.trim() === "" ? `${label} is required` : undefined

interface FormValues {
  roomNumber: string
  displayName: string
  type: RoomType
}

// ────────────────────────────────────────────────────────────────────────────
// Layout helpers — shared between create + edit forms.
// ────────────────────────────────────────────────────────────────────────────

interface PanelHeaderProps {
  title: string
  subtitle: string
  onClose: () => void
}

const PanelHeader = ({ title, subtitle, onClose }: PanelHeaderProps) => (
  <header className="flex items-start justify-between gap-2 p-4">
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title="Close panel"
      aria-label="Close panel"
      onClick={onClose}
    >
      <X />
    </Button>
  </header>
)

interface FieldWrapperProps {
  htmlFor: string
  label: string
  error?: string
  children: ReactNode
}

const FieldWrapper = ({ htmlFor, label, error, children }: FieldWrapperProps) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {error !== undefined && <p className="text-xs text-destructive">{error}</p>}
  </div>
)

interface MutationErrorProps {
  error: unknown
  fallback: string
}

const MutationErrorMessage = ({ error, fallback }: MutationErrorProps) => {
  const message = error instanceof Error ? error.message : fallback
  return (
    <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
      {message}
    </p>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Create form — Phase 5 flow.
// ────────────────────────────────────────────────────────────────────────────

const RoomCreateForm = () => {
  const { drawing, currentFloor } = useMap()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (currentFloor === null) {
        throw new Error("No floor selected")
      }
      const vertices = drawing.vertices.map((v) => ({ x: v.x, z: v.z }))
      return await createRoomData({
        data: { ...values, floor: currentFloor, vertices },
      })
    },
    onSuccess: () => {
      drawing.reset()
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ["rooms"] })
    },
  })

  const form = useForm({
    defaultValues: {
      roomNumber: "",
      displayName: "",
      type: "DEFAULT" as RoomType,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  const handleClose = () => {
    drawing.reset()
    form.reset()
    mutation.reset()
  }

  const handleRevert = () => {
    drawing.reopen()
    mutation.reset()
  }

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <PanelHeader
        title="Save room"
        subtitle={`Floor ${String(currentFloor ?? "-")} · ${String(drawing.vertices.length)} vertices`}
        onClose={handleClose}
      />

      <div className="flex flex-1 flex-col gap-4 px-4">
        <form.Field
          name="roomNumber"
          validators={{ onChange: ({ value }) => requiredString("Room number")(value) }}
        >
          {(field) => (
            <FieldWrapper
              htmlFor={field.name}
              label="Room number"
              error={field.state.meta.errors[0]}
            >
              <Input
                id={field.name}
                placeholder="2.01"
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                  mutation.reset()
                }}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
            </FieldWrapper>
          )}
        </form.Field>

        <form.Field
          name="displayName"
          validators={{ onChange: ({ value }) => requiredString("Display name")(value) }}
        >
          {(field) => (
            <FieldWrapper
              htmlFor={field.name}
              label="Display name"
              error={field.state.meta.errors[0]}
            >
              <Input
                id={field.name}
                placeholder="Project Lab"
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                  mutation.reset()
                }}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
            </FieldWrapper>
          )}
        </form.Field>

        <form.Field name="type">
          {(field) => (
            <FieldWrapper htmlFor={field.name} label="Room type">
              <Select
                value={field.state.value}
                onValueChange={(v) => {
                  if (v !== null) field.handleChange(v)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) =>
                      typeof value === "string" && value !== "" ? (
                        <RoomTypeBadge type={value as RoomType} />
                      ) : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <RoomTypeBadge type={t} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrapper>
          )}
        </form.Field>

        {mutation.isError && (
          <MutationErrorMessage error={mutation.error} fallback="Failed to save" />
        )}
      </div>

      <footer className="mt-auto flex flex-col gap-2 p-4">
        <form.Subscribe
          selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => {
            const busy = isSubmitting || mutation.isPending
            return (
              <Button type="submit" disabled={!canSubmit || busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            )
          }}
        </form.Subscribe>
        <Button type="button" variant="outline" onClick={handleRevert}>
          Revert to drawing
        </Button>
      </footer>
    </form>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Edit form — Phase 7. Auto-populates from the cached room, supports save +
// delete (with inline confirm), and stays in edit mode after success so the
// admin can move on to another room.
// ────────────────────────────────────────────────────────────────────────────

interface RoomEditFormProps {
  room: PersistedRoom
}

const RoomEditForm = ({ room }: RoomEditFormProps) => {
  const { setEditingRoomId } = useMap()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return await updateRoomMetadataData({
        data: { id: room.id, ...values },
      })
    },
    onSuccess: () => {
      setEditingRoomId(null)
      void queryClient.invalidateQueries({ queryKey: ["rooms"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await deleteRoomData({ data: { id: room.id } })
    },
    onSuccess: () => {
      setEditingRoomId(null)
      setConfirmingDelete(false)
      void queryClient.invalidateQueries({ queryKey: ["rooms"] })
    },
  })

  const form = useForm({
    defaultValues: {
      roomNumber: room.roomNumber,
      displayName: room.displayName,
      type: room.type,
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync(value)
    },
  })

  const handleClose = () => {
    setEditingRoomId(null)
    setConfirmingDelete(false)
    updateMutation.reset()
    deleteMutation.reset()
  }

  const resetMutationsOnEdit = () => {
    updateMutation.reset()
    deleteMutation.reset()
  }

  const isBusy = updateMutation.isPending || deleteMutation.isPending

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <PanelHeader
        title="Edit room"
        subtitle={`Floor ${String(room.floor)} · ${String(room.vertices.length)} vertices`}
        onClose={handleClose}
      />

      <div className="flex flex-1 flex-col gap-4 px-4">
        <form.Field
          name="roomNumber"
          validators={{ onChange: ({ value }) => requiredString("Room number")(value) }}
        >
          {(field) => (
            <FieldWrapper
              htmlFor={field.name}
              label="Room number"
              error={field.state.meta.errors[0]}
            >
              <Input
                id={field.name}
                placeholder="2.01"
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                  resetMutationsOnEdit()
                }}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
            </FieldWrapper>
          )}
        </form.Field>

        <form.Field
          name="displayName"
          validators={{ onChange: ({ value }) => requiredString("Display name")(value) }}
        >
          {(field) => (
            <FieldWrapper
              htmlFor={field.name}
              label="Display name"
              error={field.state.meta.errors[0]}
            >
              <Input
                id={field.name}
                placeholder="Project Lab"
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                  resetMutationsOnEdit()
                }}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
            </FieldWrapper>
          )}
        </form.Field>

        <form.Field name="type">
          {(field) => (
            <FieldWrapper htmlFor={field.name} label="Room type">
              <Select
                value={field.state.value}
                onValueChange={(v) => {
                  if (v !== null) field.handleChange(v)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) =>
                      typeof value === "string" && value !== "" ? (
                        <RoomTypeBadge type={value as RoomType} />
                      ) : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <RoomTypeBadge type={t} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrapper>
          )}
        </form.Field>

        {updateMutation.isError && (
          <MutationErrorMessage error={updateMutation.error} fallback="Failed to save changes" />
        )}
        {deleteMutation.isError && (
          <MutationErrorMessage error={deleteMutation.error} fallback="Failed to delete room" />
        )}
      </div>

      <footer className="mt-auto flex flex-col gap-2 p-4">
        {confirmingDelete ? (
          <>
            <p className="text-xs text-destructive">
              Delete room {room.roomNumber}? This cannot be undone.
            </p>
            <Button
              type="button"
              variant="destructive"
              disabled={isBusy}
              onClick={() => {
                deleteMutation.mutate()
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmingDelete(false)
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <form.Subscribe
              selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}
            >
              {({ canSubmit, isSubmitting }) => {
                const busy = isSubmitting || isBusy
                return (
                  <Button type="submit" disabled={!canSubmit || busy}>
                    {busy ? "Saving…" : "Save changes"}
                  </Button>
                )
              }}
            </form.Subscribe>
            <Button
              type="button"
              variant="destructive"
              disabled={isBusy}
              onClick={() => {
                setConfirmingDelete(true)
              }}
            >
              <Trash2 className="size-4" />
              Delete room
            </Button>
          </>
        )}
      </footer>
    </form>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Top-level panel — picks which form to render and owns the slide animation.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Non-modal slide-in panel hosting either the room create or edit form.
 *
 * - **Create**: opens when `drawing.closed` flips true (a draw-room polygon
 *   was completed). Save creates a new room; Discard clears the polygon.
 * - **Edit**: opens when `editingRoomId` is set (the user clicked a room
 *   while `activeTool === 'edit-room'`). Save updates metadata; Delete
 *   removes the room with an inline confirm step.
 *
 * The two flows are mutually exclusive at the context level.
 */
export const RoomMetadataPanel = () => {
  const { drawing, editingRoomId } = useMap()

  // Look up the room being edited from the same shared cache.
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getAllRoomsData(),
    enabled: editingRoomId !== null,
  })
  const editingRoom = editingRoomId ? (rooms.find((r) => r.id === editingRoomId) ?? null) : null

  const open = drawing.closed || editingRoom !== null

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed top-0 right-0 z-30 flex h-full w-88 flex-col border-l border-border bg-popover text-popover-foreground shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
    >
      {editingRoom ? (
        <RoomEditForm key={editingRoom.id} room={editingRoom} />
      ) : drawing.closed ? (
        <RoomCreateForm />
      ) : null}
    </aside>
  )
}
