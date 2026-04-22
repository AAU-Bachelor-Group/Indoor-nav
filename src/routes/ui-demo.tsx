import { createFileRoute } from "@tanstack/react-router"
import * as React from "react"

import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { RoomTypeBadge } from "#/components/ui/room-type-badge"
import { RoomType } from "#/generated/prisma/enums"
import { getRoomTypeMeta, getRoomTypeOutline } from "#/lib/room-types"
import { getAllRoomsData } from "#/server/room.functions"

import { SearchBar } from "../components/ui/search-bar"
import { SearchResultList, type SearchResultItem } from "../components/ui/search-result-list"

// ─── Demo data ────────────────────────────────────────────────────────────────

const makeItem = (id: string, title: string, roomType: RoomType): SearchResultItem => {
  const meta = getRoomTypeMeta(roomType)
  const outline = getRoomTypeOutline(roomType)
  const Icon = meta.icon
  return {
    id,
    icon: <Icon className="w-5 h-5" style={{ color: outline }} />,
    iconBgStyle: { backgroundColor: meta.color, outline: `2px solid ${outline}` },
    title,
    type: meta.label,
  }
}

const NEARBY_RESULTS: SearchResultItem[] = [
  makeItem("5.00", "Auditorium A", RoomType.MEETING_ROOM),
  makeItem("4.00", "Student Canteen", RoomType.CANTEEN),
  makeItem("3.00", "Parking Lot B", RoomType.COVERED_AREA),
]

// ─── Page ─────────────────────────────────────────────────────────────────────

const DemoPage = () => {
  const [standaloneQuery, setStandaloneQuery] = React.useState("")
  const [integratedQuery, setIntegratedQuery] = React.useState("")
  const [allResults, setAllResults] = React.useState<SearchResultItem[]>([])

  React.useEffect(() => {
    void getAllRoomsData().then((rooms) => {
      setAllResults(
        rooms.map((room) => {
          const meta = getRoomTypeMeta(room.type)
          const outlineColor = getRoomTypeOutline(room.type)
          const Icon = meta.icon
          return {
            id: room.roomNumber,
            icon: <Icon className="w-5 h-5" style={{ color: outlineColor }} />,
            iconBgStyle: {
              backgroundColor: meta.color,
              outline: `2px solid ${outlineColor}`,
            },
            title: room.displayName,
            type: `${meta.label} · Floor ${room.floor}`,
          }
        }),
      )
    })
  }, [])

  // Filter results by query for the integrated bar
  const filteredResults = integratedQuery
    ? allResults.filter(
        (r) =>
          r.title.toLowerCase().includes(integratedQuery.toLowerCase()) ||
          r.type.toLowerCase().includes(integratedQuery.toLowerCase()),
      )
    : allResults

  return (
    <main className="min-h-screen bg-background font-sans">
      {/* Simulated map background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(200,220,200,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,220,200,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          backgroundColor: "#e8f0e8",
        }}
        aria-hidden="true"
      />

      <div className="max-w-lg mx-auto px-4 py-10 space-y-12">
        {/* ── Section 1: Integrated bar ───────────────────────────────── */}
        <section aria-labelledby="integrated-heading">
          <h2
            id="integrated-heading"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3"
          >
            SearchBar — type=&quot;integrated&quot;
          </h2>
          <SearchBar
            type="integrated"
            placeholder="Search locations..."
            value={integratedQuery}
            onQueryChange={setIntegratedQuery}
            onSearch={(q) => {
              console.log("Search:", q)
            }}
            results={filteredResults}
            onResultClick={(item) => {
              console.log("Selected:", item.title)
            }}
          />
          <p className="text-xs text-muted-foreground mt-3">
            Click on the search bar to see the dropdown overlay
          </p>
        </section>

        {/* ── Section 2: Standalone bar ───────────────────────────────── */}
        <section aria-labelledby="standalone-heading">
          <h2
            id="standalone-heading"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3"
          >
            SearchBar — type=&quot;standalone&quot;
          </h2>
          <SearchBar
            type="standalone"
            placeholder="Search..."
            value={standaloneQuery}
            onQueryChange={setStandaloneQuery}
            onSearch={(q) => {
              console.log("Search:", q)
            }}
          />
        </section>

        {/* ── Section 3: SearchResultList standalone ──────────────────── */}
        <section aria-labelledby="results-heading">
          <h2
            id="results-heading"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3"
          >
            SearchResultList — standalone
          </h2>
          <SearchResultList
            items={NEARBY_RESULTS}
            onItemClick={(item) => {
              console.log("Clicked:", item.title)
            }}
          />
        </section>

        {/* ── Section 4: Shadcn basics ───────────────────────────── */}
        <section aria-labelledby="shadcn-heading">
          <h2
            id="shadcn-heading"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3"
          >
            Shadcn — basics
          </h2>

          <div className="space-y-4">
            {/* Inputs */}
            <div className="space-y-2">
              <Input placeholder="Default input" />
              <Input placeholder="Disabled input" disabled />
              <Input placeholder="Error input" aria-invalid={true} />
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>

            {/* Badge */}
            <div className="mt-10 flex-col">
              <h2
                id="shadcn-heading"
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3"
              >
                Room type badge
              </h2>
              <RoomTypeBadge type="DEFAULT" variant="search" />
              <RoomTypeBadge type="OFFICE" variant="search" className="ml-5" />
              <RoomTypeBadge type="MEETING_ROOM" variant="search" className="ml-5" />
              <RoomTypeBadge type="CANTEEN" variant="search" className="ml-5" />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export const Route = createFileRoute("/ui-demo")({
  component: DemoPage,
})
