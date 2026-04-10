import { useQuery } from "@tanstack/react-query"
import { createContext, useContext, useState } from "react"

import { getFloorPlansData } from "#/server/floorplan.functions"

import type { FloorPlan } from "#/types/floor-plan"
import type { ReactNode } from "react"

type RenderMode = "2d" | "3d"

interface MapContextValue {
  floors: FloorPlan[]
  currentFloor: number | null
  setCurrentFloor: (floor: number) => void
  isLoading: boolean
  renderMode: RenderMode
  setRenderMode: (mode: RenderMode) => void
  debugMode: boolean
  setDebugMode: (debug: boolean) => void
}

const MapContext = createContext<MapContextValue | null>(null)

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const { data: floors = [], isLoading } = useQuery({
    queryKey: ["floorPlans"],
    queryFn: getFloorPlansData,
  })

  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)

  // Use explicit selection, or default to the lowest floor
  const currentFloor =
    selectedFloor !== null && floors.some((f) => f.floor === selectedFloor)
      ? selectedFloor
      : floors.length > 0
        ? Math.min(...floors.map((f) => f.floor))
        : null

  const [renderMode, setRenderMode] = useState<RenderMode>("2d")

  const [debugMode, setDebugMode] = useState(false)

  return (
    <MapContext.Provider
      value={{
        floors,
        currentFloor,
        setCurrentFloor: setSelectedFloor,
        isLoading,
        renderMode,
        setRenderMode,
        debugMode,
        setDebugMode,
      }}
    >
      {children}
    </MapContext.Provider>
  )
}

export const useMap = () => {
  const context = useContext(MapContext)
  if (!context) {
    throw new Error("useMap must be used within a MapProvider")
  }
  return context
}
