import { Html } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { ArrowUpDown, TrendingUpDown } from "lucide-react"
import { Fragment, useRef, useMemo } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"
import { useNavigation } from "#/lib/navigation-context"
import { mapPointToThree } from "#/lib/three-utils"

import { MARKER_LIFT } from "./constants"
import { AnimatedPathLine, EdgePreview } from "./draw-primitives"

import type { Node } from "#/types/node"

const SHOW_ZOOM_THRESHOLD = 8
const BASE_ZOOM = 20
/** Distance at which the marker reaches full size in perspective mode. Picked
 * to feel roughly equivalent to ortho's `BASE_ZOOM` ramp via the same
 * REF_2D_ZOOM / REF_3D_DISTANCE proportion used elsewhere. */
const BASE_DISTANCE_3D = 75
const HIDE_DISTANCE_3D = 200

interface FloorTransition {
  position: [number, number, number]
  nodeType: Node["type"]
  fromFloor: number
  toFloor: number
}

const FloorTransitionMarker = ({ transition: t }: { transition: FloorTransition }) => {
  const { camera } = useThree()
  const ref = useRef<HTMLDivElement>(null)

  useFrame(() => {
    const el = ref.current
    if (!el) return
    const ortho = camera as THREE.OrthographicCamera
    if (ortho.isOrthographicCamera) {
      if (ortho.zoom < SHOW_ZOOM_THRESHOLD) {
        el.style.display = "none"
      } else {
        el.style.display = "flex"
        const scale = Math.min(1, ortho.zoom / BASE_ZOOM)
        el.style.transform = `scale(${scale})`
      }
    } else {
      // Perspective: scale on inverse-distance so the marker stays roughly
      // screen-stable. Hide when far enough away that the icon would shrink
      // into illegibility.
      const dist = camera.position.distanceTo(new THREE.Vector3(...t.position))
      if (dist > HIDE_DISTANCE_3D) {
        el.style.display = "none"
      } else {
        el.style.display = "flex"
        const scale = Math.min(1, BASE_DISTANCE_3D / Math.max(1, dist))
        el.style.transform = `scale(${scale})`
      }
    }
  })

  const isElevator = t.nodeType === "ELEVATOR"
  const Icon = isElevator ? ArrowUpDown : TrendingUpDown
  const verb = isElevator ? "Take elevator" : "Take stairs"

  return (
    <Html position={t.position} center zIndexRange={[0, 0]} pointerEvents="none">
      <div
        ref={ref}
        className="flex items-center gap-1.5 rounded-full bg-gray-900/95 px-3 py-1.5 shadow-lg whitespace-nowrap border border-white/10"
      >
        <Icon className="size-3.5 shrink-0 text-white/70" />
        <span className="text-xs font-semibold text-white">
          {verb} to Floor {t.toFloor}
        </span>
      </div>
    </Html>
  )
}

const FloorTransitionMarkers = () => {
  const { navigationPath } = useNavigation()
  const { renderMode, currentFloor } = useMap()

  const transitions = useMemo<FloorTransition[]>(() => {
    if (!navigationPath || navigationPath.length < 2) return []

    // Collect raw floor-change edges.
    const raw: FloorTransition[] = []
    for (let i = 0; i < navigationPath.length - 1; i++) {
      const cur = navigationPath[i]
      const next = navigationPath[i + 1]
      if (cur.floor !== next.floor) {
        raw.push({
          position: mapPointToThree(cur, MARKER_LIFT),
          nodeType: cur.type,
          fromFloor: cur.floor,
          toFloor: next.floor,
        })
      }
    }

    // Merge consecutive same-type transitions (e.g. 3→2 + 2→1 → 3→1)
    // so the user sees one label per elevator/stair ride, not one per floor.
    const merged: FloorTransition[] = []
    for (const t of raw) {
      const prev = merged.at(-1)
      if (prev?.nodeType === t.nodeType && prev.toFloor === t.fromFloor) {
        prev.toFloor = t.toFloor
      } else {
        merged.push({ ...t })
      }
    }
    return merged
  }, [navigationPath])

  return (
    <>
      {transitions.map((t, i) => {
        if (renderMode === "2d" && t.fromFloor !== currentFloor) return null
        return <FloorTransitionMarker key={i} transition={t} />
      })}
    </>
  )
}

/**
 * Renders the navigation path as a continuous line connecting all nodes
 * in the calculated route. In 3D mode the full path is shown. In 2D mode
 * only the current floor's visible segments are rendered.
 */
export const NavigationPathLayer = () => {
  const { navigationPath } = useNavigation()
  const { renderMode, currentFloor } = useMap()

  const visiblePathSegments = useMemo(() => {
    if (!navigationPath || navigationPath.length < 2) return []

    const toPoint = (node: (typeof navigationPath)[number]) =>
      mapPointToThree({ x: node.x, y: node.y, floor: node.floor }, MARKER_LIFT)

    if (renderMode === "3d") {
      return [navigationPath.map(toPoint)]
    }

    const segments: ReturnType<typeof toPoint>[][] = []
    let currentSegment: ReturnType<typeof toPoint>[] = []

    for (const node of navigationPath) {
      if (node.floor !== currentFloor) {
        if (currentSegment.length >= 2) {
          segments.push(currentSegment)
        }
        currentSegment = []
        continue
      }

      currentSegment.push(toPoint(node))
    }

    if (currentSegment.length >= 2) {
      segments.push(currentSegment)
    }

    return segments
  }, [navigationPath, renderMode, currentFloor])

  if (visiblePathSegments.length === 0 && !navigationPath?.length) return null

  return (
    <>
      {visiblePathSegments.map((segment, index) => (
        <Fragment key={index}>
          <EdgePreview points={segment} color="#4406e0" lineWidth={6} opacity={0.15} />
          <AnimatedPathLine points={segment} color="#4406e0" lineWidth={5} />
        </Fragment>
      ))}
      <FloorTransitionMarkers />
    </>
  )
}
