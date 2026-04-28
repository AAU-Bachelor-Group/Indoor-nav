import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  CoordinateInputs,
  DetailRow,
  FLOOR_HEIGHT_METERS,
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
import {
  activateNodeData,
  addEdgeData,
  deactivateNodeData,
  deleteEdgeData,
  deleteNodeData,
  getAllEdgesData,
  getAllNodesData,
  updateNodeData,
} from "#/server/graph.functions"
import { getAllRoomsData } from "#/server/room.functions"

import type { NodeType } from "#/generated/prisma/enums"

interface DeleteFooterProps {
  busy: boolean
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

const DeleteFooter = ({ busy, isPending, onConfirm, onCancel }: DeleteFooterProps) => (
  <>
    <p className="text-xs text-destructive">Delete this node? This cannot be undone.</p>
    <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>
      {isPending ? "Deleting…" : "Confirm delete"}
    </Button>
    <Button type="button" variant="outline" onClick={onCancel}>
      Cancel
    </Button>
  </>
)

interface DefaultFooterProps {
  busy: boolean
  saveBusyText: string
  onAskDelete: () => void
}

const DefaultFooter = ({ busy, saveBusyText, onAskDelete }: DefaultFooterProps) => (
  <>
    <Button className="hover:bg-slate-300" variant="outline" type="submit" disabled={busy}>
      {saveBusyText}
    </Button>
    <Button type="button" variant="destructive" disabled={busy} onClick={onAskDelete}>
      <Trash2 className="size-4" />
      Delete node
    </Button>
  </>
)

interface TransitConnectionsProps {
  type: NodeType
  groupByFloor: Map<number, { id: string }>
  currentFloor: number
  isConnected: (otherNodeId: string) => boolean
  busy: boolean
  onToggle: (connect: boolean, floor: number) => void
  error?: unknown
}

const TransitConnections = ({
  type,
  groupByFloor,
  currentFloor,
  isConnected,
  busy,
  onToggle,
  error,
}: TransitConnectionsProps) => (
  <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
    <div>
      <Label>Connections to other floors</Label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Check a floor to add a direct edge from this node to the {NODE_TYPE_LABELS[type]} node
        there. Uncheck to remove it.
      </p>
    </div>
    <div className="flex flex-col gap-1">
      {[...groupByFloor.keys()]
        .filter((floor) => floor !== currentFloor)
        .sort((a, b) => a - b)
        .map((floor) => {
          const floorNode = groupByFloor.get(floor)
          if (!floorNode) return null
          const connected = isConnected(floorNode.id)
          return (
            <label
              key={floor}
              className={cn(
                "flex items-center gap-2 text-sm",
                busy ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                checked={connected}
                disabled={busy}
                onChange={() => {
                  onToggle(!connected, floor)
                }}
              />
              Floor {floor}
              <span
                className={cn("text-xs", connected ? "text-green-500" : "text-muted-foreground")}
              >
                {connected ? "— connected" : "— no edge"}
              </span>
            </label>
          )
        })}
    </div>
    {error !== undefined && <MutationError error={error} fallback="Failed to update connection" />}
  </div>
)

interface NodeEditPanelProps {
  nodeId: string
}

/**
 * "Edit node" panel — opens when the user clicks an existing node. Lets the
 * admin reposition, change type, toggle active, and (for transit nodes)
 * manage cross-floor connections. Also supports deletion with inline confirm.
 */
export const NodeEditPanel = ({ nodeId }: NodeEditPanelProps) => {
  const { setEditingNodeId } = useMap()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: allNodes = [] } = useQuery({ queryKey: ["nodes"], queryFn: getAllNodesData })
  const { data: allEdges = [] } = useQuery({ queryKey: ["edges"], queryFn: getAllEdgesData })
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms"], queryFn: getAllRoomsData })

  const node = allNodes.find((n) => n.id === nodeId) ?? null
  const linkedRoom = node?.roomId ? (rooms.find((r) => r.id === node.roomId) ?? null) : null

  const [xText, setXText] = useState(() => (node?.x ?? 0).toFixed(2))
  const [yText, setYText] = useState(() => (node?.y ?? 0).toFixed(2))
  const myXRef = useRef(node?.x ?? 0)
  const myYRef = useRef(node?.y ?? 0)

  const patchCache = (x: number, y: number) => {
    queryClient.setQueryData(["nodes"], (old: typeof allNodes) =>
      old.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
    )
  }

  const updateMutation = useMutation({
    mutationFn: async (values: { type: NodeType; x: number; y: number }) =>
      updateNodeData({ data: { id: nodeId, ...values } }),
    onSuccess: () => {
      setEditingNodeId(null)
      void queryClient.invalidateQueries({ queryKey: ["nodes"] })
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ["nodes"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => deleteNodeData({ data: { id: nodeId } }),
    onSuccess: () => {
      setEditingNodeId(null)
      void queryClient.invalidateQueries({ queryKey: ["nodes"] })
      void queryClient.invalidateQueries({ queryKey: ["edges"] })
    },
  })

  const activateMutation = useMutation({
    mutationFn: async (active: boolean) =>
      active
        ? activateNodeData({ data: { id: nodeId } })
        : deactivateNodeData({ data: { id: nodeId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nodes"] })
      void queryClient.invalidateQueries({ queryKey: ["edges"] })
    },
  })

  // Co-located transit nodes: same type, within 0.1m XY of this node.
  const groupNodes = useMemo(() => {
    if (!node || !TRANSIT_TYPES.has(node.type)) return []
    return allNodes.filter(
      (n) => n.type === node.type && Math.hypot(n.x - node.x, n.y - node.y) < 0.1,
    )
  }, [allNodes, node])

  const groupByFloor = useMemo(() => new Map(groupNodes.map((n) => [n.floor, n])), [groupNodes])
  const groupNodeIds = useMemo(() => new Set(groupNodes.map((n) => n.id)), [groupNodes])
  const transitEdges = useMemo(
    () => allEdges.filter((e) => groupNodeIds.has(e.fromNodeId) && groupNodeIds.has(e.toNodeId)),
    [allEdges, groupNodeIds],
  )

  const findDirectEdge = (id1: string, id2: string) =>
    transitEdges.find(
      (e) =>
        (e.fromNodeId === id1 && e.toNodeId === id2) ||
        (e.fromNodeId === id2 && e.toNodeId === id1),
    )

  const transitMutation = useMutation({
    mutationFn: async ({ connect, floor }: { connect: boolean; floor: number }) => {
      if (!node) return
      const floorNode = groupByFloor.get(floor)
      if (!floorNode) return

      if (connect) {
        await addEdgeData({
          data: {
            fromNodeId: node.id,
            toNodeId: floorNode.id,
            distance: FLOOR_HEIGHT_METERS * Math.abs(floor - node.floor),
            isActivated: node.isActivated,
          },
        })
      } else {
        const existing = findDirectEdge(node.id, floorNode.id)
        if (existing) await deleteEdgeData({ data: { id: existing.id } })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["edges"] })
    },
  })

  const form = useForm({
    defaultValues: { type: node?.type ?? "DEFAULT" },
    onSubmit: async ({ value }) => {
      const x = Number.parseFloat(xText)
      const y = Number.parseFloat(yText)
      await updateMutation.mutateAsync({
        type: value.type,
        x: Number.isNaN(x) ? (node?.x ?? 0) : x,
        y: Number.isNaN(y) ? (node?.y ?? 0) : y,
      })
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

  if (!node) return null

  const handleClose = () => {
    setEditingNodeId(null)
    setConfirmingDelete(false)
    updateMutation.reset()
    deleteMutation.reset()
  }

  const isBusy = updateMutation.isPending || deleteMutation.isPending

  // ── header ────────────────────────────────────────────────────────────────
  const header = (
    <PanelTitle
      title="Node"
      subtitle={`Floor ${node.floor} · ${NODE_TYPE_LABELS[node.type] ?? node.type}`}
    />
  )

  // ── body ──────────────────────────────────────────────────────────────────
  const body = (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border">
        <CoordinateInputs
          idPrefix="edit-coord"
          xText={xText}
          yText={yText}
          onXChange={(text, v) => {
            setXText(text)
            if (v !== null) {
              myXRef.current = v
              patchCache(v, myYRef.current)
            }
          }}
          onYChange={(text, v) => {
            setYText(text)
            if (v !== null) {
              myYRef.current = v
              patchCache(myXRef.current, v)
            }
          }}
        />
        <DetailRow label="Floor" value={node.floor} />
        <div className="flex-col items-center justify-between">
          <Label htmlFor="isActivated">Active</Label>
          <Switch
            className="mt-3 data-unchecked:border-white/30 data-unchecked:bg-white/15 data-checked:bg-sidebar-primary"
            checked={node.isActivated}
            onCheckedChange={(v) => {
              activateMutation.mutate(v)
            }}
            disabled={activateMutation.isPending}
          />
        </div>
        <DetailRow
          label="Room"
          value={linkedRoom ? `${linkedRoom.roomNumber} · ${linkedRoom.displayName}` : "None"}
        />
      </div>

      <form.Field name="type">
        {(field) => (
          <NodeTypeSelect
            id={field.name}
            value={field.state.value}
            onChange={(v) => {
              field.handleChange(v)
              updateMutation.reset()
            }}
          />
        )}
      </form.Field>

      {TRANSIT_TYPES.has(node.type) && groupNodes.length > 1 && (
        <TransitConnections
          type={node.type}
          groupByFloor={groupByFloor}
          currentFloor={node.floor}
          isConnected={(otherId) => !!findDirectEdge(node.id, otherId)}
          busy={transitMutation.isPending}
          onToggle={(connect, floor) => {
            transitMutation.mutate({ connect, floor })
          }}
          error={transitMutation.isError ? transitMutation.error : undefined}
        />
      )}

      {updateMutation.isError && (
        <MutationError error={updateMutation.error} fallback="Failed to save" />
      )}
      {deleteMutation.isError && (
        <MutationError error={deleteMutation.error} fallback="Failed to delete" />
      )}
    </div>
  )

  // ── footer ────────────────────────────────────────────────────────────────
  const footer = (
    <div className="flex flex-col gap-2 p-4">
      {confirmingDelete ? (
        <DeleteFooter
          busy={isBusy}
          isPending={deleteMutation.isPending}
          onConfirm={() => {
            deleteMutation.mutate()
          }}
          onCancel={() => {
            setConfirmingDelete(false)
          }}
        />
      ) : (
        <form.Subscribe
          selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => (
            <DefaultFooter
              busy={!canSubmit || isSubmitting || isBusy}
              saveBusyText={updateMutation.isPending ? "Saving…" : "Save changes"}
              onAskDelete={() => {
                setConfirmingDelete(true)
              }}
            />
          )}
        </form.Subscribe>
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
