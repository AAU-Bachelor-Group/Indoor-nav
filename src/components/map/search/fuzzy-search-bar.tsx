import { useState } from "react"

import { useFuzzySearch } from "#/components/hooks/use-fuse"
import { SearchBar } from "#/components/ui/search-bar"
import { useMap } from "#/lib/map-context"
import { getRoomTypeMeta, getRoomTypeOutline } from "#/lib/room-types"

import type { SearchResultItem } from "#/components/ui/search-result-list"

type SearchResultItemWithDbId = SearchResultItem & { dbId: string }

export const FuzzySearchBar = () => {
  const { setViewingRoomId, setEditingRoomId, activeTool } = useMap()
  const [query, setQuery] = useState("")
  const { results, isLoading } = useFuzzySearch(query)
  const hasQuery = query.trim().length > 0

  const fuzzyResults: SearchResultItem[] = isLoading
    ? []
    : results.map((r) => {
        const meta = getRoomTypeMeta(r.item.type)
        const outline = getRoomTypeOutline(r.item.type)
        const Icon = meta.icon
        return {
          id: r.item.roomNumber,
          icon: <Icon className="w-5 h-5" style={{ color: outline }} />,
          iconBgStyle: { backgroundColor: meta.color, outline: `2px solid ${outline}` },
          title: r.item.displayName || "",
          type: meta.label,
          dbId: r.item.id,
        }
      })
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
      className="absolute top-4 left-4 right-4 w-auto z-10 sm:left-30 sm:right-auto sm:w-90"
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
        const { dbId } = item as SearchResultItemWithDbId
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
