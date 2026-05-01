import { NodeCreatePanel } from "#/components/panels/node/node-create-panel"
import { NodeEditPanel } from "#/components/panels/node/node-edit-panel"
import { useMap } from "#/lib/map-context"

/**
 * Dispatcher for the two node admin panels:
 * - `editingNodeId` set → edit existing node (`NodeEditPanel`).
 * - `pendingNode` set → create new node (`NodeCreatePanel`).
 *
 * The two are mutually exclusive at the context level, so only one is ever
 * mounted at a time.
 */
export const NodePanels = () => {
  const { pendingNode, editingNodeId } = useMap()
  if (editingNodeId) return <NodeEditPanel key={editingNodeId} nodeId={editingNodeId} />
  if (pendingNode) return <NodeCreatePanel />
  return null
}
