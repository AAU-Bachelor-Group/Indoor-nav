import { useQuery } from '@tanstack/react-query'
import { getAllRoomsFunction } from '#/server/search.functions'
import Fuse from 'fuse.js'

export const useFuzzySearch = (searchTerm: string) => {
  const { data: allRooms, isLoading, isError } = useQuery({
    queryKey: ["getAllRooms"],
    queryFn: getAllRoomsFunction,
  })

  const fuse = new Fuse(allRooms ?? [], {
    keys: ['id', 'title', 'semanticNames', 'type'],
  })

  const results = fuse.search(searchTerm)
  
  return { results, isLoading, isError }
}