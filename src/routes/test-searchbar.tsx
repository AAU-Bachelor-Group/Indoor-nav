import { createFileRoute } from "@tanstack/react-router"
import { SearchBar } from "#/components/ui/search-bar"

function RouteComponent() {
  return (
    <div>
      <SearchBar
        type="fuzzysearch"
        placeholder="Search locations..."
        onResultClick={(item) => console.log("Selected:", item.title)}
      />
    </div>
  )
}

export const Route = createFileRoute("/test-searchbar")({
  component: RouteComponent,
})