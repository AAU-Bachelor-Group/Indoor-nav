import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Panel } from "#/components/panels/panel"
import {
  DisplayNameField,
  type FormValues,
  MutationErrorMessage,
  PanelTitle,
  RoomNumberField,
  RoomTypeField,
  requiredString,
} from "#/components/panels/room/room-panel-shared"
import { Button } from "#/components/ui/button"
import { useMap } from "#/lib/map-context"
import { createRoomData } from "#/server/room.functions"

import type { RoomType } from "#/generated/prisma/enums"

/**
 * "Save room" panel — Phase 5 flow. Opens after a draw-room polygon has been
 * closed; collects metadata and creates the room. Revert returns to drawing.
 */
export const RoomCreatePanel = () => {
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

  // ── header ────────────────────────────────────────────────────────────────
  const header = (
    <PanelTitle
      title="Save room"
      subtitle={`Floor ${String(currentFloor ?? "-")} · ${String(drawing.vertices.length)} vertices`}
    />
  )

  // ── footer ────────────────────────────────────────────────────────────────
  const footer = (
    <div className="flex flex-col gap-2 p-4">
      <form.Subscribe selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}>
        {({ canSubmit, isSubmitting }) => {
          const busy = isSubmitting || mutation.isPending
          return (
            <Button
              className="hover:bg-slate-300"
              variant="outline"
              type="submit"
              disabled={!canSubmit || busy}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          )
        }}
      </form.Subscribe>
      <Button type="button" variant="destructive" onClick={handleRevert}>
        Revert to drawing
      </Button>
    </div>
  )

  // ── body ──────────────────────────────────────────────────────────────────
  const body = (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <form.Field
        name="roomNumber"
        validators={{ onChange: ({ value }) => requiredString("Room number")(value) }}
      >
        {(field) => (
          <RoomNumberField
            id={field.name}
            value={field.state.value}
            error={field.state.meta.errors[0]}
            invalid={field.state.meta.errors.length > 0}
            onChange={(v) => {
              field.handleChange(v)
              mutation.reset()
            }}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Field name="displayName">
        {(field) => (
          <DisplayNameField
            id={field.name}
            value={field.state.value}
            error={field.state.meta.errors[0]}
            invalid={field.state.meta.errors.length > 0}
            onChange={(v) => {
              field.handleChange(v)
              mutation.reset()
            }}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <RoomTypeField id={field.name} value={field.state.value} onChange={field.handleChange} />
        )}
      </form.Field>

      {mutation.isError && (
        <MutationErrorMessage error={mutation.error} fallback="Failed to save" />
      )}
    </div>
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <Panel open onClose={handleClose} header={header} footer={footer}>
        {body}
      </Panel>
    </form>
  )
}
