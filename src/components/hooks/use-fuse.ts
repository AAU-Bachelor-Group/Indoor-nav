import { useQuery } from "@tanstack/react-query"
import Fuse from "fuse.js"
import { useState, useMemo, useEffect } from "react"

import { getAllRoomsFunction } from "#/server/search.functions"

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
    queryKey: ["getAllRooms"],
    queryFn: getAllRoomsFunction,
  })

  const fuse = new Fuse(allRooms ?? [], {
    keys: [
      { name: "id", weight: 0.7 },
      { name: "semanticNames", weight: 0.3 },
    ],
    threshold: 0.4,
  })

  const results = useMemo(() => fuse.search(debouncedTerm), [fuse, debouncedTerm])

  return { results, isLoading, isError }
}
