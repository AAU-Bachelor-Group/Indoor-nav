import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"

import { Panel } from "#/components/panels/panel"
import { Button } from "#/components/ui/button"
import { useMap } from "#/lib/map-context"
import { deleteEdgeData, getAllEdgesData, getAllNodesData } from "#/server/graph.functions"

const nodeLabel = (floor: number, x: number, y: number) =>
  `Floor ${floor} · (${x.toFixed(2)}, ${y.toFixed(2)})`

export const EdgePanel = () => {
  const { editingEdgeId, setEditingEdgeId } = useMap()
  const queryClient = useQueryClient()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: allEdges = [] } = useQuery({ queryKey: ["edges"], queryFn: getAllEdgesData })
  const { data: allNodes = [] } = useQuery({ queryKey: ["nodes"], queryFn: getAllNodesData })

  const edge = editingEdgeId ? (allEdges.find((e) => e.id === editingEdgeId) ?? null) : null
  const fromNode = edge ? (allNodes.find((n) => n.id === edge.fromNodeId) ?? null) : null
  const toNode = edge ? (allNodes.find((n) => n.id === edge.toNodeId) ?? null) : null

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEdgeData({ data: { id } }),
    onSuccess: () => {
      setEditingEdgeId(null)
      void queryClient.invalidateQueries({ queryKey: ["edges"] })
    },
  })

  const handleClose = () => {
    setEditingEdgeId(null)
    setConfirmingDelete(false)
  }

  const open = edge !== null

  // 1. Panel Header
  const header = edge && (
    <div className="p-4 pr-14">
      <h2 className="text-lg font-semibold">Edge</h2>
      <p className="text-sm text-muted-foreground">{edge.distance.toFixed(2)} m</p>
    </div>
  )

  // 2. Panel Body (The main content of the panel)
  const body = edge && (
    <div className="flex flex-col gap-4 px-4 pb-4">
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
  )

  // 3. Panel Footer (Actions related to the edge, such as delete)
  const footer = edge && (
    <div className="flex flex-col gap-2 p-4">
      {confirmingDelete ? (
        <>
          <p className="text-xs text-destructive">Delete this edge? This cannot be undone.</p>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              deleteMutation.mutate(edge.id)
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
        <Button
          type="button"
          variant="destructive"
          disabled={deleteMutation.isPending}
          onClick={() => {
            setConfirmingDelete(true)
          }}
        >
          <Trash2 className="size-4" />
          Delete edge
        </Button>
      )}
    </div>
  )

  return (
    <Panel open={open} onClose={handleClose} header={header} footer={footer}>
      {body}
    </Panel>
  )
}
