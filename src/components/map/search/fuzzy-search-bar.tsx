import { useState } from "react"

import { useFuzzySearch } from "#/components/hooks/use-fuse"
import { SearchBar } from "#/components/ui/search-bar"
import { useMap } from "#/lib/map-context"
import { roomToSearchResultItem, type RoomSearchResultItem } from "#/lib/room-format"

import type { SearchResultItem } from "#/components/ui/search-result-list"

export const FuzzySearchBar = ({ className }: { className?: string }) => {
  const { setViewingRoomId, setEditingRoomId, activeTool } = useMap()
  const [query, setQuery] = useState("")
  const { results, isLoading } = useFuzzySearch(query)
  const hasQuery = query.trim().length > 0

  const fuzzyResults: RoomSearchResultItem[] = isLoading
    ? []
    : results.map((r) => roomToSearchResultItem(r.item))
  const noResults = hasQuery && !isLoading && fuzzyResults.length === 0

  const displayResults: SearchResultItem[] = noResults
    ? [
        {
          id: "No results found",
          title: "",
          type: "",
          icon: "",
          iconBgStyle: { backgroundColor: "transparent" },
        },
      ]
    : fuzzyResults

  return (
    <SearchBar
      className={className}
      type="integrated"
      placeholder="Search locations..."
      value={query}
      onQueryChange={setQuery}
      onSearch={(q) => {
        console.log("Search:", q)
      }}
      results={displayResults}
      onResultClick={(item) => {
        if (item.id === "no results found") return
        const { dbId } = item as RoomSearchResultItem
        if (activeTool === "default") {
          setViewingRoomId(dbId)
        } else if (["draw-room", "edit-room", "draw-node", "connect-edge"].includes(activeTool)) {
          setEditingRoomId(dbId)
        }
      }}
      showResultsWhenEmpty={true}
    />
  )
}
