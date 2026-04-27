import { useQuery } from "@tanstack/react-query"
import Fuse from "fuse.js"
import { useState, useMemo, useEffect } from "react"

import { ROOM_TYPE_ALT } from "#/lib/room-types"
import { getAllRoomsData } from "#/server/room.functions"

export const useFuzzySearch = (searchTerm: string) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 200)
    return () => {
      clearTimeout(timer)
    }
  }, [searchTerm])

  const {
    data: allRooms,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["rooms"],
    queryFn: getAllRoomsData,
  })

  const allRoomsWithAlts = useMemo(
    () =>
      allRooms?.map((room) => ({
        ...room,
        room_type_alt: ROOM_TYPE_ALT[room.type],
      })),
    [allRooms],
  )

  const fuse = new Fuse(allRoomsWithAlts ?? [], {
    keys: [
      { name: "roomNumber", weight: 0.7 },
      { name: "displayName", weight: 0.7 },
      { name: "type", weight: 0.3 },
      { name: "room_type_alt", weight: 0.3 },
    ],
    threshold: debouncedTerm.length <= 3 ? 0.6 : 0.4,
  })

  const results = useMemo(() => fuse.search(debouncedTerm, { limit: 6 }), [fuse, debouncedTerm])

  return { results, isLoading, isError }
}
