import { Html, Line } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useRef, useState } from "react"
import * as THREE from "three"

import { mapFromWorld } from "#/lib/coordinates"
import { useMap } from "#/lib/map-context"

import { FLOOR_HEIGHT } from "./constants"

export const CursorCoordinates = () => {
  const { camera, raycaster, pointer } = useThree()

  const { currentFloor, debugMode, renderMode } = useMap()

  const positionRef = useRef(new THREE.Vector3())
  const prevSpacingRef = useRef<number | null>(null)

  const [position, setPosition] = useState(new THREE.Vector3())

  const [coords, setCoords] = useState({
    x: 0,
    y: 0,
    z: 0,
  })

  const [gridLines, setGridLines] = useState<{ points: THREE.Vector3[]; color: string }[]>([])

  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))

  const floorY = (currentFloor ?? 0) * FLOOR_HEIGHT

  useFrame(() => {
    if (!debugMode || renderMode === "3d") return

    plane.current.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, floorY, 0),
    )

    raycaster.setFromCamera(pointer, camera)

    const hit = raycaster.ray.intersectPlane(plane.current, positionRef.current)

    if (hit) {
      const worldPos = positionRef.current.clone()
      setPosition(worldPos)
      setCoords(mapFromWorld(worldPos))
    }

    // Calculate adaptive grid
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

    // Determine "nice" grid spacing (1, 2, 5, 10, etc.) using view width and mantissa method (mantissa example: first part of a number in base 10, e.g. 37 -> 3.7 * 10^1 -> mantissa 3.7, exponent 1 -> nice mantissa 5)
    const targetSpacing = viewWidth / 20
    const log = Math.log10(targetSpacing)
    const floorLog = Math.floor(log)
    const mantissa = 10 ** (log - floorLog)
    let niceMantissa
    if (mantissa < 1.5) niceMantissa = 1
    else if (mantissa < 3.5) niceMantissa = 2
    else if (mantissa < 7.5) niceMantissa = 5
    else niceMantissa = 10
    const spacing = niceMantissa * 10 ** floorLog

    // Only update grid if spacing changed
    if (prevSpacingRef.current === spacing) return
    prevSpacingRef.current = spacing

    // Calculate view bounds with margin for grid lines
    const margin = Math.max(viewWidth, viewHeight) * 0.5
    const minX = camera.position.x - viewWidth / 2 - margin
    const maxX = camera.position.x + viewWidth / 2 + margin
    const minZ = camera.position.z - viewHeight / 2 - margin
    const maxZ = camera.position.z + viewHeight / 2 + margin

    const lines: { points: THREE.Vector3[]; color: string }[] = []

    // Vertical lines (constant X, varying Z)
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

    // Horizontal lines (constant Z, varying X)
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

  if (!debugMode || renderMode === "3d") return null

  return (
    <>
      {gridLines.map((line, i) => (
        <Line
          key={`${i}-${line.color}`}
          points={line.points}
          color={line.color}
          lineWidth={1}
          dashed={false}
        />
      ))}
      <Html position={position} className="pointer-events-none">
        <div className="bg-black text-white px-1.5 py-1 text-[12px] rounded whitespace-nowrap translate-x-[10px] translate-y-[5px]">
          x: {coords.x.toFixed(2)}
          <br />
          y: {coords.y.toFixed(2)}
          <br />
          z: {coords.z.toFixed(0)}
        </div>
      </Html>
    </>
  )
}
