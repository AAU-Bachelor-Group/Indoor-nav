import { useState } from "react"
import { useFuzzySearch } from "#/components/hooks/use-fuse"
import { SearchBar } from "#/components/ui/search-bar"
import { useMap } from "#/lib/map-context"
import type { SearchResultItem } from "#/components/ui/search-result-list"
import { getRoomTypeMeta, getRoomTypeOutline } from "#/lib/room-types"

export const FuzzySearchBar = () => {
  const { setViewingRoomId, setEditingNodeId, setEditingRoomId, activeTool } = useMap()
  const [query, setQuery] = useState("")
  const { results, isLoading } = useFuzzySearch(query)

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

  return (
    <SearchBar
      className="absolute top-4 left-30 z-10 w-90"
      type="integrated"
      placeholder="Search locations..."
      value={query}
      onQueryChange={setQuery}
      onSearch={(q) => console.log("Search:", q)}
      results={fuzzyResults}
      onResultClick={(item) => {
        if (activeTool === "default")
          setViewingRoomId(((item as any).dbId as string) ?? null)
        if (activeTool === "edit-room")
            setEditingRoomId(((item as any).dbId as string) ?? null)
/*         if (activeTool === "edit-node")
            setEditingNodeId(((item as any).dbId as string) ?? null) */
      }}
      showResultsWhenEmpty={true}
    />
  )
}
