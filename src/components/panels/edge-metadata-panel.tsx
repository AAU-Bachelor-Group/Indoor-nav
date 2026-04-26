import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2, X } from "lucide-react"
import { useState } from "react"

import { Button } from "#/components/ui/button"
import { useMap } from "#/lib/map-context"
import { cn } from "#/lib/utils"
import { deleteEdgeData, getAllEdgesData, getAllNodesData } from "#/server/graph.functions"

const EdgePanel = ({ edgeId }: { edgeId: string }) => {
  const { setEditingEdgeId } = useMap()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: allEdges = [] } = useQuery({ queryKey: ["edges"], queryFn: getAllEdgesData })
  const { data: allNodes = [] } = useQuery({ queryKey: ["nodes"], queryFn: getAllNodesData })

  const edge = allEdges.find((e) => e.id === edgeId) ?? null
  const fromNode = edge ? (allNodes.find((n) => n.id === edge.fromNodeId) ?? null) : null
  const toNode = edge ? (allNodes.find((n) => n.id === edge.toNodeId) ?? null) : null

  const deleteMutation = useMutation({
    mutationFn: () => deleteEdgeData({ data: { id: edgeId } }),
    onSuccess: () => {
      setEditingEdgeId(null)
      void queryClient.invalidateQueries({ queryKey: ["edges"] })
    },
  })

  if (!edge) return null

  const handleClose = () => {
    setEditingEdgeId(null)
    setConfirmingDelete(false)
  }

  const nodeLabel = (floor: number, x: number, y: number) =>
    `Floor ${floor} · (${x.toFixed(2)}, ${y.toFixed(2)})`

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-2 p-4">
        <div>
          <h2 className="text-lg font-semibold">Edge</h2>
          <p className="text-sm text-muted-foreground">{edge.distance.toFixed(2)} m</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close panel"
          onClick={handleClose}
        >
          <X />
        </Button>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">From</span>
            <span>
              {fromNode ? nodeLabel(fromNode.floor, fromNode.x, fromNode.y) : edge.fromNodeId}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">To</span>
            <span>{toNode ? nodeLabel(toNode.floor, toNode.x, toNode.y) : edge.toNodeId}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Distance</span>
            <span>{edge.distance.toFixed(2)} m</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <span>{edge.isActivated ? "Active" : "Inactive"}</span>
          </div>
        </div>

        {deleteMutation.isError && (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            {deleteMutation.error instanceof Error
              ? deleteMutation.error.message
              : "Failed to delete edge"}
          </p>
        )}
      </div>

      <footer className="mt-auto flex flex-col gap-2 p-4">
        {confirmingDelete ? (
          <>
            <p className="text-xs text-destructive">Delete this edge? This cannot be undone.</p>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => { deleteMutation.mutate(); }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setConfirmingDelete(false); }}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => { setConfirmingDelete(true); }}
          >
            <Trash2 className="size-4" />
            Delete edge
          </Button>
        )}
      </footer>
    </div>
  )
}

export const EdgeMetadataPanel = () => {
  const { editingEdgeId } = useMap()
  const open = editingEdgeId !== null

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed top-0 right-0 z-30 flex h-full w-88 flex-col border-l border-border bg-popover text-popover-foreground shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
    >
      {editingEdgeId && <EdgePanel key={editingEdgeId} edgeId={editingEdgeId} />}
    </aside>
  )
}
