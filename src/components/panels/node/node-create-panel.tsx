import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import {
  CoordinateInputs,
  DetailRow,
  MutationError,
  NODE_TYPE_LABELS,
  NodeTypeSelect,
  PanelTitle,
  TRANSIT_TYPES,
} from "#/components/panels/node/node-panel-shared"
import { Panel } from "#/components/panels/panel"
import { Button } from "#/components/ui/button"
import { Label } from "#/components/ui/label"
import { Switch } from "#/components/ui/switch"
import { useMap } from "#/lib/map-context"
import { cn } from "#/lib/utils"
import { addNodeData, createTransitNodesData } from "#/server/graph.functions"
import { getAllRoomsData } from "#/server/room.functions"

import type { NodeType } from "#/generated/prisma/enums"
import type { FloorPlan } from "#/types/floor-plan"

interface MultiFloorPickerProps {
  type: NodeType
  floors: FloorPlan[]
  currentFloor: number
  extraFloors: number[]
  onToggle: (floor: number) => void
}

const MultiFloorPicker = ({
  type,
  floors,
  currentFloor,
  extraFloors,
  onToggle,
}: MultiFloorPickerProps) => (
  <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
    <div>
      <Label>Place on multiple floors</Label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        A {NODE_TYPE_LABELS[type]} node at this position will be created on each checked floor.
      </p>
    </div>
    <div className="flex flex-col gap-1">
      {floors
        .slice()
        .sort((a, b) => a.floor - b.floor)
        .map((f) => {
          const isCurrent = f.floor === currentFloor
          const checked = isCurrent || extraFloors.includes(f.floor)
          return (
            <label
              key={f.floor}
              className={cn(
                "flex items-center gap-2 text-sm",
                isCurrent ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isCurrent}
                onChange={() => {
                  onToggle(f.floor)
                }}
              />
              Floor {f.floor}
              {isCurrent && <span className="text-xs text-muted-foreground">— this floor</span>}
            </label>
          )
        })}
    </div>
  </div>
)

/**
 * "Place node" panel — opens when the user clicks an empty spot on the canvas
 * with the draw-node tool active. Captures coordinates, type, optional
 * multi-floor placement for transit types, and active-state.
 */
export const NodeCreatePanel = () => {
  const { pendingNode, setPendingNode, floors } = useMap()
  const queryClient = useQueryClient()

  const [xText, setXText] = useState(() => (pendingNode?.x ?? 0).toFixed(2))
  const [yText, setYText] = useState(() => (pendingNode?.y ?? 0).toFixed(2))
  const myXRef = useRef(pendingNode?.x ?? 0)
  const myYRef = useRef(pendingNode?.y ?? 0)
  const [prevPendingNode, setPrevPendingNode] = useState(pendingNode)
  const [extraFloors, setExtraFloors] = useState<number[]>([])

  // Sync text inputs when pendingNode changes from an external source (map click).
  // This uses React's "adjust state on render" pattern instead of useEffect.
  if (pendingNode !== prevPendingNode) {
    setPrevPendingNode(pendingNode)
    // eslint-disable-next-line react-hooks/refs
    if (pendingNode && pendingNode.x !== myXRef.current) {
      setXText(pendingNode.x.toFixed(2))
      // eslint-disable-next-line react-hooks/refs
      myXRef.current = pendingNode.x
    }
    // eslint-disable-next-line react-hooks/refs
    if (pendingNode && pendingNode.y !== myYRef.current) {
      setYText(pendingNode.y.toFixed(2))
      // eslint-disable-next-line react-hooks/refs
      myYRef.current = pendingNode.y
    }
  }

  const { data: rooms = [] } = useQuery({ queryKey: ["rooms"], queryFn: getAllRoomsData })
  const linkedRoom = rooms.find((r) => r.id === pendingNode?.roomId) ?? null

  const mutation = useMutation({
    mutationFn: async (values: { type: NodeType; isActivated: boolean }) => {
      if (!pendingNode) throw new Error("No position selected")
      const allFloors = [pendingNode.floor, ...extraFloors]
      if (TRANSIT_TYPES.has(values.type) && allFloors.length > 1) {
        return await createTransitNodesData({
          data: {
            x: pendingNode.x,
            y: pendingNode.y,
            z: pendingNode.z,
            type: values.type as "STAIR" | "ELEVATOR",
            floors: allFloors,
            isActivated: values.isActivated,
            roomId: pendingNode.roomId,
          },
        })
      }
      return await addNodeData({
        data: {
          x: pendingNode.x,
          y: pendingNode.y,
          z: pendingNode.z,
          floor: pendingNode.floor,
          type: values.type,
          isActivated: values.isActivated,
          roomId: pendingNode.roomId,
        },
      })
    },
    onSuccess: () => {
      setPendingNode(null)
      void queryClient.invalidateQueries({ queryKey: ["nodes"] })
      void queryClient.invalidateQueries({ queryKey: ["edges"] })
    },
  })

  const form = useForm({
    defaultValues: { type: "DEFAULT" as NodeType, isActivated: true },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        void form.handleSubmit()
      }
    }
    globalThis.addEventListener("keydown", handleKeyDown)
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown)
    }
  }, [form])

  const handleClose = () => {
    setPendingNode(null)
    form.reset()
    mutation.reset()
  }

  const toggleExtraFloor = (floor: number) => {
    setExtraFloors((prev) =>
      prev.includes(floor) ? prev.filter((f) => f !== floor) : [...prev, floor],
    )
  }

  // ── header ────────────────────────────────────────────────────────────────
  const header = (
    <PanelTitle title="Place node" subtitle={`Floor ${String(pendingNode?.floor ?? "-")}`} />
  )

  // ── body ──────────────────────────────────────────────────────────────────
  const body = (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <CoordinateInputs
        idPrefix="create-coord"
        xText={xText}
        yText={yText}
        onXChange={(text, v) => {
          setXText(text)
          if (v !== null && pendingNode) {
            myXRef.current = v
            setPendingNode({ ...pendingNode, x: v })
          }
        }}
        onYChange={(text, v) => {
          setYText(text)
          if (v !== null && pendingNode) {
            myYRef.current = v
            setPendingNode({ ...pendingNode, y: v })
          }
        }}
      />

      <form.Field name="type">
        {(field) => (
          <>
            <NodeTypeSelect
              id={field.name}
              value={field.state.value}
              onChange={(v) => {
                field.handleChange(v)
                mutation.reset()
                if (!TRANSIT_TYPES.has(v)) setExtraFloors([])
              }}
            />
            {TRANSIT_TYPES.has(field.state.value) && floors.length > 1 && pendingNode && (
              <MultiFloorPicker
                type={field.state.value}
                floors={floors}
                currentFloor={pendingNode.floor}
                extraFloors={extraFloors}
                onToggle={toggleExtraFloor}
              />
            )}
          </>
        )}
      </form.Field>

      <DetailRow
        label="Room"
        value={linkedRoom ? `${linkedRoom.roomNumber} · ${linkedRoom.displayName}` : "None"}
      />

      <form.Field name="isActivated">
        {(field) => (
          <div className="flex-col items-center justify-between">
            <Label htmlFor={field.name}>Active</Label>
            <Switch
              className="mt-3 data-unchecked:border-white/30 data-unchecked:bg-white/15 data-checked:bg-sidebar-primary"
              id={field.name}
              checked={field.state.value}
              onCheckedChange={(v) => {
                field.handleChange(v)
              }}
            />
          </div>
        )}
      </form.Field>

      {mutation.isError && <MutationError error={mutation.error} fallback="Failed to place node" />}
    </div>
  )

  // ── footer ────────────────────────────────────────────────────────────────
  const footer = (
    <div className="flex flex-col gap-2 p-4">
      <form.Subscribe selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}>
        {({ canSubmit, isSubmitting }) => (
          <Button
            className="hover:bg-slate-300"
            variant="outline"
            type="submit"
            disabled={!canSubmit || isSubmitting || mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        )}
      </form.Subscribe>
      <Button type="button" variant="destructive" onClick={handleClose}>
        Cancel
      </Button>
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
