import { useRef, useState } from "react"

import { useFuzzySearch } from "#/components/hooks/use-fuse"
import { RoomTypeBadge } from "#/components/ui/room-type-badge"
import { SearchBar } from "#/components/ui/search-bar"
import { useMap } from "#/lib/map-context"
import { roomToSearchResultItem, type RoomSearchResultItem } from "#/lib/room-format"

import type { SearchResultItem } from "#/components/ui/search-result-list"
import type { RoomType } from "#/generated/prisma/enums"

type SearchResultItemWithDbId = SearchResultItem & { dbId: string; roomType: RoomType }

export const FuzzySearchBar = ({ className }: { className?: string }) => {
  const { setViewingRoomId, setEditingRoomId, activeTool } = useMap()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState("")
  const [selectedType, setSelectedType] = useState<RoomType | "">("")
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
    : filteredResults

  const handleResultClick = (item: SearchResultItem) => {
    if (item.id === "No results found") return
    const { dbId } = item as RoomSearchResultItem
    if (activeTool === "default") {
      setViewingRoomId(dbId)
    } else if (["draw-room", "edit-room", "draw-node", "connect-edge"].includes(activeTool)) {
      setEditingRoomId(dbId)
    }
  }

  const handleBadgeClick = (type: RoomType) => {
    setSelectedType((selected: RoomType | "") => {
      const newType = selected === type ? "" : type
      if (inputRef.current) {
        inputRef.current.focus()
      }
      return newType
    })
  }

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <SearchBar
        className="w-full"
        type="integrated"
        placeholder="Search locations..."
        value={query}
        onQueryChange={setQuery}
        onSearch={() => {
          // Search action is handled by live query updates.
        }}
        inputRef={inputRef}
        results={displayResults}
        onResultClick={handleResultClick}
        showResultsWhenEmpty={selectedType !== ""}
      />

      <div className="w-full">
        <div className="flex gap-2 overflow-x-auto px-3 py-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ROOM_TYPES.map((type) => {
            const isSelected = selectedType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  handleBadgeClick(type)
                }}
                className={cn(
                  "shrink-0 snap-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                <RoomTypeBadge
                  type={type}
                  variant="search"
                  className={cn(
                    isSelected ? "border-primary ring-2 ring-secondary" : "border-border/60",
                    "cursor-pointer",
                  )}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
