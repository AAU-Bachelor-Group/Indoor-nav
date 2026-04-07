import { useQuery } from "@tanstack/react-query"
import { getAllRoomsFunction } from "#/server/search.functions"
import Fuse from "fuse.js"

export const useFuzzySearch = (searchTerm: string) => {
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

  const results = fuse.search(searchTerm)

  return { results, isLoading, isError }
}
