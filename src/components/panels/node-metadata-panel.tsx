import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import { Switch } from "#/components/ui/switch"
import { useMap } from "#/lib/map-context"
import { cn } from "#/lib/utils"
import {
  activateNodeData,
  addEdgeData,
  addNodeData,
  createTransitNodesData,
  deactivateNodeData,
  deleteEdgeData,
  deleteNodeData,
  getAllEdgesData,
  getAllNodesData,
  updateNodeData,
} from "#/server/graph.functions"
import { getAllRoomsData } from "#/server/room.functions"

import type { NodeType } from "#/generated/prisma/enums"
import type { ReactNode } from "react"

const NODE_TYPE_LABELS: Record<string, string> = {
  DEFAULT: "Default",
  DOOR: "Door",
  STAIR: "Stair",
  ELEVATOR: "Elevator",
  ENDPOINT: "Endpoint",
}

const nodeTypes: NodeType[] = ["DEFAULT", "DOOR", "STAIR", "ELEVATOR", "ENDPOINT"]

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────

const PanelHeader = ({
  title,
  subtitle,
  onClose,
}: {
  title: string
  subtitle: string
  onClose: () => void
}) => (
  <header className="flex items-start justify-between gap-2 p-4">
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Close panel" onClick={onClose}>
      <X />
    </Button>
  </header>
)

const FieldWrapper = ({
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

const DetailRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-2">
    <Label>{label}</Label>
    <span className="text-sm">{value}</span>
  </div>
)

const MutationError = ({ error, fallback }: { error: unknown; fallback: string }) => (
  <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
    {error instanceof Error ? error.message : fallback}
  </p>
)

// ─────────────────────────────────────────────────────────────────────────────
// Create form — opens when the user clicks an empty spot on the canvas.
// ─────────────────────────────────────────────────────────────────────────────

const TRANSIT_TYPES = new Set<NodeType>(["STAIR", "ELEVATOR"])
const FLOOR_HEIGHT_METERS = 3.25

const NodeCreateForm = () => {
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

  const handleClose = () => {
    setPendingNode(null)
    form.reset()
    mutation.reset()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        void form.handleSubmit()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [form])

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <PanelHeader
        title="Place node"
        subtitle={`Floor ${String(pendingNode?.floor ?? "-")}`}
        onClose={handleClose}
      />

      <div className="flex flex-1 flex-col gap-4 px-4">
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="coord-x">X</Label>
            <Input
              id="coord-x"
              className="bg-background text-black focus:ring-offset-2"
              value={xText}
              onChange={(e) => {
                setXText(e.target.value)
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && pendingNode) {
                  myXRef.current = v
                  setPendingNode({ ...pendingNode, x: v })
                }
              }}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="coord-y">Y</Label>
            <Input
              id="coord-y"
              className="bg-background text-black focus:ring-offset-2"
              value={yText}
              onChange={(e) => {
                setYText(e.target.value)
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && pendingNode) {
                  myYRef.current = v
                  setPendingNode({ ...pendingNode, y: v })
                }
              }}
            />
          </div>
        </div>

        <form.Field name="type">
          {(field) => (
            <>
              <FieldWrapper htmlFor={field.name} label="Node type">
                <Select
                  value={field.state.value}
                  onValueChange={(v) => {
                    if (v) {
                      field.handleChange(v)
                      mutation.reset()
                      if (!TRANSIT_TYPES.has(v as NodeType)) setExtraFloors([])
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-background text-black">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background text-black">
                    {nodeTypes.map((t) => (
                      <SelectItem
                        className="focus:bg-sidebar-primary/40 cursor-pointer"
                        key={t}
                        value={t}
                      >
                        {NODE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrapper>

              {TRANSIT_TYPES.has(field.state.value) && floors.length > 1 && (
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div>
                    <Label>Place on multiple floors</Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      A {NODE_TYPE_LABELS[field.state.value]} node at this position will be created
                      on each checked floor.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {floors
                      .sort((a, b) => a.floor - b.floor)
                      .map((f) => {
                        const isCurrent = f.floor === pendingNode?.floor
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
                                setExtraFloors((prev) =>
                                  checked ? prev.filter((n) => n !== f.floor) : [...prev, f.floor],
                                )
                              }}
                            />
                            Floor {f.floor}
                            {isCurrent && (
                              <span className="text-xs text-muted-foreground">— this floor</span>
                            )}
                          </label>
                        )
                      })}
                  </div>
                </div>
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

        {mutation.isError && (
          <MutationError error={mutation.error} fallback="Failed to place node" />
        )}
      </div>

      <footer className="mt-auto flex flex-col gap-2 p-4">
        <form.Subscribe
          selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}
        >
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
      </footer>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit form — opens when the user clicks an existing node on the canvas.
// Shows all values; only type is editable. Supports delete with confirm.
// ─────────────────────────────────────────────────────────────────────────────

const NodeEditForm = ({ nodeId }: { nodeId: string }) => {
  const { setEditingNodeId } = useMap()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: allNodes = [] } = useQuery({
    queryKey: ["nodes"],
    queryFn: getAllNodesData,
  })
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

  const form = useForm({
    defaultValues: { type: node?.type ?? "DEFAULT" },
    onSubmit: async ({ value }) => {
      const x = parseFloat(xText)
      const y = parseFloat(yText)
      await updateMutation.mutateAsync({
        type: value.type,
        x: isNaN(x) ? (node?.x ?? 0) : x,
        y: isNaN(y) ? (node?.y ?? 0) : y,
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
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [form])

  const { data: allEdges = [] } = useQuery({
    queryKey: ["edges"],
    queryFn: getAllEdgesData,
  })

  // Co-located nodes: same type within 0.1 m XY
  const groupNodes = useMemo(() => {
    if (!node || !TRANSIT_TYPES.has(node.type)) return []
    return allNodes.filter(
      (n) => n.type === node.type && Math.hypot(n.x - node.x, n.y - node.y) < 0.1,
    )
  }, [allNodes, node])

  const groupByFloor = useMemo(() => new Map(groupNodes.map((n) => [n.floor, n])), [groupNodes])

  const groupNodeIds = useMemo(() => new Set(groupNodes.map((n) => n.id)), [groupNodes])

  // Edges that run between co-located nodes only
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

  if (!node) return null

  const handleClose = () => {
    setEditingNodeId(null)
    setConfirmingDelete(false)
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
        title="Node"
        subtitle={`Floor ${node.floor} · ${NODE_TYPE_LABELS[node.type] ?? node.type}`}
        onClose={handleClose}
      />

      <div className="flex flex-1 flex-col gap-4 px-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border">
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-coord-x">X</Label>
              <Input
                id="edit-coord-x"
                className="bg-background text-black focus:ring-offset-2"
                value={xText}
                onChange={(e) => {
                  setXText(e.target.value)
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) {
                    myXRef.current = v
                    patchCache(v, myYRef.current)
                  }
                }}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-coord-y">Y</Label>
              <Input
                id="edit-coord-y"
                className="bg-background text-black focus:ring-offset-2"
                value={yText}
                onChange={(e) => {
                  setYText(e.target.value)
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) {
                    myYRef.current = v
                    patchCache(myXRef.current, v)
                  }
                }}
              />
            </div>
          </div>
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
            <FieldWrapper htmlFor={field.name} label="Node type">
              <Select
                value={field.state.value}
                onValueChange={(v) => {
                  if (v) {
                    field.handleChange(v)
                    updateMutation.reset()
                  }
                }}
              >
                <SelectTrigger className="w-full bg-background text-black">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-background text-black">
                  {nodeTypes.map((t) => (
                    <SelectItem
                      className="focus:bg-sidebar-primary/40 cursor-pointer"
                      key={t}
                      value={t}
                    >
                      {NODE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrapper>
          )}
        </form.Field>

        {TRANSIT_TYPES.has(node.type) && groupNodes.length > 1 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div>
              <Label>Connections to other floors</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Check a floor to add a direct edge from this node to the{" "}
                {NODE_TYPE_LABELS[node.type]} node there. Uncheck to remove it.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              {[...groupByFloor.keys()]
                .filter((floor) => floor !== node.floor)
                .sort((a, b) => a - b)
                .map((floor) => {
                  const floorNode = groupByFloor.get(floor)
                  if (!floorNode) return null
                  const isConnected = !!findDirectEdge(node.id, floorNode.id)
                  return (
                    <label
                      key={floor}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        transitMutation.isPending
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isConnected}
                        disabled={transitMutation.isPending}
                        onChange={() => {
                          transitMutation.mutate({ connect: !isConnected, floor })
                        }}
                      />
                      Floor {floor}
                      <span
                        className={cn(
                          "text-xs",
                          isConnected ? "text-green-500" : "text-muted-foreground",
                        )}
                      >
                        {isConnected ? "— connected" : "— no edge"}
                      </span>
                    </label>
                  )
                })}
            </div>
            {transitMutation.isError && (
              <MutationError error={transitMutation.error} fallback="Failed to update connection" />
            )}
          </div>
        )}

        {updateMutation.isError && (
          <MutationError error={updateMutation.error} fallback="Failed to save" />
        )}
        {deleteMutation.isError && (
          <MutationError error={deleteMutation.error} fallback="Failed to delete" />
        )}
      </div>

      <footer className="mt-auto flex flex-col gap-2 p-4">
        {confirmingDelete ? (
          <>
            <p className="text-xs text-destructive">Delete this node? This cannot be undone.</p>
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
              {({ canSubmit, isSubmitting }) => (
                <Button
                  className="hover:bg-slate-300"
                  variant="outline"
                  type="submit"
                  disabled={!canSubmit || isSubmitting || isBusy}
                >
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              )}
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
              Delete node
            </Button>
          </>
        )}
      </footer>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level panel
// ─────────────────────────────────────────────────────────────────────────────

export const NodeMetadataPanel = () => {
  const { pendingNode, editingNodeId } = useMap()
  const open = pendingNode !== null || editingNodeId !== null

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed top-0 right-0 z-30 flex h-full w-88 flex-col border-l border-border bg-popover text-popover-foreground shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
    >
      {editingNodeId ? (
        <NodeEditForm key={editingNodeId} nodeId={editingNodeId} />
      ) : pendingNode ? (
        <NodeCreateForm />
      ) : null}
    </aside>
  )
}
