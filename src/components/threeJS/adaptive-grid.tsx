import { Line } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useRef, useState } from "react"
import * as THREE from "three"

import { useMap } from "#/lib/map-context"

import { FLOOR_HEIGHT } from "./constants"

interface AdaptiveGridProps {
  /**
   * Whether the grid should render. Kept as a prop (rather than read from
   * context) so the same component can be driven by debug mode OR by an
   * active drawing tool, without baking either policy into the grid itself.
   */
  visible: boolean
}

interface GridLine {
  points: [THREE.Vector3, THREE.Vector3]
  color: string
}

/**
 * Nice-mantissa grid spacing picker — rounds a target spacing to 1/2/5/10
 * of the nearest power of 10 so the grid lines land on human-readable
 * intervals as the user zooms.
 */
const pickSpacing = (targetSpacing: number): number => {
  const log = Math.log10(targetSpacing)
  const floorLog = Math.floor(log)
  const mantissa = 10 ** (log - floorLog)
  const niceMantissa = mantissa < 1.5 ? 1 : mantissa < 3.5 ? 2 : mantissa < 7.5 ? 5 : 10
  return niceMantissa * 10 ** floorLog
}

/**
 * Top-down adaptive grid for the active floor. Grid spacing rounds to
 * human-friendly intervals (1/2/5 × 10ⁿ) and recomputes only when the
 * spacing bucket changes — so panning/zooming doesn't thrash state.
 *
 * Writes the current spacing to `gridSpacingRef` on the map context so
 * snap-to-grid logic (in the drawing layer) uses the same cells the user
 * sees.
 */
export const AdaptiveGrid = ({ visible }: AdaptiveGridProps) => {
  const { camera } = useThree()
  const { currentFloor, renderMode, gridSpacingRef } = useMap()

  const prevSpacingRef = useRef<number | null>(null)
  const [gridLines, setGridLines] = useState<GridLine[]>([])

  const floorY = (currentFloor ?? 0) * FLOOR_HEIGHT

  useFrame(() => {
    if (!visible || renderMode === "3d") return

    let viewWidth: number
    let viewHeight: number
    if (camera instanceof THREE.PerspectiveCamera) {
      const distance = Math.abs(camera.position.y - floorY)
      const fovRad = (camera.fov * Math.PI) / 180
      viewHeight = 2 * distance * Math.tan(fovRad / 2)
      viewWidth = viewHeight * camera.aspect
    } else if (camera instanceof THREE.OrthographicCamera) {
      viewWidth = (camera.right - camera.left) / camera.zoom
      viewHeight = (camera.top - camera.bottom) / camera.zoom
    } else {
      viewWidth = 100
      viewHeight = 100
    }

    const spacing = pickSpacing(viewWidth / 20)
    gridSpacingRef.current = spacing

    if (prevSpacingRef.current === spacing) return
    prevSpacingRef.current = spacing

    const margin = Math.max(viewWidth, viewHeight) * 0.5
    const minX = camera.position.x - viewWidth / 2 - margin
    const maxX = camera.position.x + viewWidth / 2 + margin
    const minZ = camera.position.z - viewHeight / 2 - margin
    const maxZ = camera.position.z + viewHeight / 2 + margin

    const lines: GridLine[] = []

    for (let x = Math.floor(minX / spacing) * spacing; x <= maxX; x += spacing) {
      const isMajor = Math.abs(x) < spacing / 2
      lines.push({
        points: [
          new THREE.Vector3(x, floorY + 0.1, minZ),
          new THREE.Vector3(x, floorY + 0.1, maxZ),
        ],
        color: isMajor ? "#ff0000" : "#444444",
      })
    }

    for (let z = Math.floor(minZ / spacing) * spacing; z <= maxZ; z += spacing) {
      const isMajor = Math.abs(z) < spacing / 2
      lines.push({
        points: [
          new THREE.Vector3(minX, floorY + 0.1, z),
          new THREE.Vector3(maxX, floorY + 0.1, z),
        ],
        color: isMajor ? "#ff0000" : "#444444",
      })
    }

    setGridLines(lines)
  })

  if (!visible || renderMode === "3d") return null

  return (
    <>
      {gridLines.map((line, i) => (
        <Line
          key={`${String(i)}-${line.color}`}
          points={line.points}
          color={line.color}
          lineWidth={1}
          dashed={false}
        />
      ))}
    </>
  )
}
