import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { QrCode, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

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
import { QRCodeDialog } from "#/components/qr-code-dialog"
import { Button } from "#/components/ui/button"
import { useMap } from "#/lib/map-context"
import { deleteRoomData, updateRoomMetadataData } from "#/server/room.functions"

import type { Room } from "#/types/room"

interface RoomEditPanelProps {
  room: Room
}

/**
 * "Edit room" panel — Phase 7. Auto-populates from the cached room, supports
 * save + delete (with inline confirm), and stays in edit mode after success
 * so the admin can move on to another room.
 */
export const RoomEditPanel = ({ room }: RoomEditPanelProps) => {
  const { setEditingRoomId } = useMap()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  const qrUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/?startRoom=${encodeURIComponent(room.id)}`
  }, [room.id])

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
      // Form internals use `string | undefined` for unset; the DB stores `null`.
      displayName: room.displayName ?? undefined,
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

  // ── header ────────────────────────────────────────────────────────────────
  const header = (
    <PanelTitle
      title="Edit room"
      subtitle={`Floor ${String(room.floor)} · ${String(room.vertices.length)} vertices`}
    />
  )

  // ── footer ────────────────────────────────────────────────────────────────
  const footer = (
    <div className="flex flex-col gap-2 p-4">
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
                <Button
                  className="hover:bg-slate-300"
                  variant="outline"
                  type="submit"
                  disabled={!canSubmit || busy}
                >
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              )
            }}
          </form.Subscribe>
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => {
              setQrOpen(true)
            }}
          >
            <QrCode className="size-4" />
            Generate QR code
          </Button>
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
              resetMutationsOnEdit()
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
              resetMutationsOnEdit()
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

      {updateMutation.isError && (
        <MutationErrorMessage error={updateMutation.error} fallback="Failed to save changes" />
      )}
      {deleteMutation.isError && (
        <MutationErrorMessage error={deleteMutation.error} fallback="Failed to delete room" />
      )}
    </div>
  )

  return (
    <>
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
      <QRCodeDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={qrUrl}
        title={`QR code · Room ${room.roomNumber}`}
        description="Scanning this opens the navigator with this room as the start location."
        filename={`qr-room-${room.roomNumber}`}
      />
    </>
  )
}
