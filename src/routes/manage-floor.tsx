import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { useState, useRef } from "react"

import { CalibrateFloorForm } from "#/components/forms/calibrate-floor-form"
import ImportFloorForm from "#/components/forms/import-floor-form"
import { buttonVariants } from "#/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import { getServerSession } from "#/lib/auth-server"
import { getFloorPlansData } from "#/server/floorplan.functions"

import type { FloorPlan } from "#/types/floor-plan"

interface Point {
  x: number
  y: number
  rx: number
  ry: number
}

const CalibrateFloor = () => {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: floorPlansData } = useQuery({
    queryKey: ["floorPlans"],
    queryFn: getFloorPlansData,
  })

  // Find the currently selected floor plan
  const selectedFloorPlan = floorPlansData?.find((fp: FloorPlan) => fp.floor === selectedFloor)

  // Calculate the distance in image pixels between the two points (Eucledian)
  const pixelDistance =
    points.length === 2 ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) : 0

  // Handle clicks on the floor plan image
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (points.length >= 2) {
      setPoints([])
      return
    }
    const img = containerRef.current?.querySelector("img")
    if (!img) return
    const rect = img.getBoundingClientRect()

    setPoints((prev) => [
      ...prev,
      {
        x: ((e.clientX - rect.left) / rect.width) * img.naturalWidth,
        y: ((e.clientY - rect.top) / rect.height) * img.naturalHeight,
        rx: e.clientX - rect.left,
        ry: e.clientY - rect.top,
      },
    ])
  }

  // Rendered coordinates for the first and second points (stored at click time)
  const p1r = points.length === 2 ? { x: points[0].rx, y: points[0].ry } : null
  const p2r = points.length === 2 ? { x: points[1].rx, y: points[1].ry } : null

  // Midpoint between the two points (used to position the form)
  const midR = p1r && p2r ? { x: (p1r.x + p2r.x) / 2, y: (p1r.y + p2r.y) / 2 } : null

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-6 pt-4">
        <Link to="/" className={buttonVariants({ variant: "default" })}>
          ← Back
        </Link>
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-7xl gap-8 px-6 pb-10">
        <div className="flex min-h-[70vh] w-1/2 flex-col items-center gap-y-3 rounded-xl border bg-card p-6 text-center">
          <h1 className="font-bold">Upload Floor Plan</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Upload a floor plan image for each floor. Supported formats: PNG, JPEG. Max size: 5MB.
          </p>
          <ImportFloorForm />
        </div>

        <div className="flex min-h-[70vh] w-1/2 flex-col items-center gap-y-3 rounded-xl border bg-card p-6 text-center">
          <h1 className="font-bold">Calibrate Floor Plan</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Select a floor, then click 2 points on the map and enter the real distance in meters.
          </p>

          {selectedFloorPlan && (
            <p className="text-xs text-muted-foreground">
              Current scale: {selectedFloorPlan.calibrationScale} m/px
            </p>
          )}

          <div className="flex items-center gap-2">
            <p className="text-xs">Toggle a floor:</p>
            <Select
              onValueChange={(v) => {
                setSelectedFloor(Number(v))
                setPoints([]) // Reset points when changing floor
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select floor" />
              </SelectTrigger>
              <SelectContent>
                {floorPlansData?.map((fp: FloorPlan) => (
                  <SelectItem key={fp.floor} value={String(fp.floor)}>
                    Floor {fp.floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFloorPlan && (
            <div
              role="button"
              tabIndex={0}
              ref={containerRef}
              onClick={handleImageClick}
              className="mt-2 max-w-full overflow-auto"
              style={{ position: "relative", display: "inline-block", cursor: "crosshair" }}
            >
              <img src={selectedFloorPlan.path} alt="Floor plan" className="border max-w-full" />

              {/* Render points as red dots */}
              {points.map((point) => (
                <div
                  key={`${point.rx}-${point.ry}`}
                  style={{
                    position: "absolute",
                    left: point.rx,
                    top: point.ry,
                    width: 10,
                    height: 10,
                    background: "red",
                    borderRadius: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}

              {/* Draw line between points if two points are selected */}
              {p1r && p2r && (
                <svg
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                >
                  <line x1={p1r.x} y1={p1r.y} x2={p2r.x} y2={p2r.y} stroke="blue" strokeWidth={2} />
                </svg>
              )}

              {midR && selectedFloor !== null && (
                <CalibrateFloorForm
                  floor={selectedFloor}
                  pixelDistance={pixelDistance}
                  position={midR}
                  onReset={() => {
                    setPoints([])
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export const Route = createFileRoute("/manage-floor")({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (session?.user.username !== "admin") {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" })
    }
  },
  component: CalibrateFloor,
})
