import { useMemo, useRef } from "react"

import type { ThreeEvent } from "@react-three/fiber"

import type * as THREE from "three"

/** Pointer-move distance (px) above which a press-release is treated as a drag, not a click. */
const DRAG_THRESHOLD_PX_MOUSE = 5
/** Touch input jitters more than mouse, so the threshold needs to be more forgiving on mobile. */
const DRAG_THRESHOLD_PX_TOUCH = 12

interface UseCanvasPointerOptions {
  /** Fires on a click that is not part of a camera drag. Receives the world-space hit point. */
  onClick: (point: THREE.Vector3) => void
  /** Optional move handler — useful for cursor preview lines. Receives the world-space hit point. */
  onMove?: (point: THREE.Vector3) => void
  /** When false, all returned handlers are no-ops. */
  enabled?: boolean
}

interface CanvasPointerHandlers {
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void
}

/**
 * Wires click-vs-drag disambiguation on top of R3F's mesh pointer events,
 * so vertex placement does not interfere with OrbitControls drag-to-pan/rotate.
 *
 * Spread the returned handlers onto a raycast target mesh (e.g. RaycastPlane).
 * R3F's `e.point` is already the world-space hit; we just clone it before
 * handing it to the caller so the caller can hold onto it across frames
 * without R3F mutating it.
 */
export const useCanvasPointer = ({
  onClick,
  onMove,
  enabled = true,
}: UseCanvasPointerOptions): CanvasPointerHandlers => {
  const downPos = useRef<{ x: number; y: number; pointerType: string } | null>(null)

  return useMemo<CanvasPointerHandlers>(() => {
    if (!enabled) {
      return {}
    }

    const handlers: CanvasPointerHandlers = {
      onPointerDown: (e) => {
        downPos.current = { x: e.clientX, y: e.clientY, pointerType: e.pointerType }
      },
      onPointerUp: (e) => {
        const start = downPos.current
        downPos.current = null
        if (!start) return
        const dx = e.clientX - start.x
        const dy = e.clientY - start.y
        const threshold =
          start.pointerType === "touch" ? DRAG_THRESHOLD_PX_TOUCH : DRAG_THRESHOLD_PX_MOUSE
        if (Math.hypot(dx, dy) > threshold) return
        onClick(e.point.clone())
      },
    }

    if (onMove) {
      handlers.onPointerMove = (e) => {
        onMove(e.point.clone())
      }
    }

    return handlers
  }, [enabled, onClick, onMove])
}
