import { createFileRoute } from "@tanstack/react-router"
import { Building2, MapPin, GraduationCap, Coffee, Train } from "lucide-react"
import * as React from "react"

import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"

import { SearchBar } from "../components/ui/search-bar"
import { SearchResultList, type SearchResultItem } from "../components/ui/search-result-list"

// ─── Demo data ────────────────────────────────────────────────────────────────

const ALL_RESULTS: SearchResultItem[] = [
  {
    id: "lecture-hall",
    icon: <GraduationCap className="w-5 h-5" />,
    title: "Building 101",
    semantic: "Software lecture room",
  },
  {
    id: "library",
    icon: <Building2 className="w-5 h-5" />,
    title: "Main Library",
    semantic: "University library",
  },
  {
    id: "station",
    icon: <Train className="w-5 h-5" />,
    title: "Central Station",
    semantic: "Train station",
  },
  {
    id: "coffee",
    icon: <Coffee className="w-5 h-5" />,
    title: "Campus Coffee",
    semantic: "Coffee shop",
  },
]

const NEARBY_RESULTS: SearchResultItem[] = [
  {
    id: "auditorium",
    icon: <Building2 className="w-5 h-5" />,
    title: "Auditorium A",
    semantic: "Main auditorium",
  },
  {
    id: "canteen",
    icon: <MapPin className="w-5 h-5" />,
    title: "Student Canteen",
    semantic: "Cafeteria",
  },
  {
    id: "parking",
    icon: <MapPin className="w-5 h-5" />,
    title: "Parking Lot B",
    semantic: "Parking area",
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

const DemoPage = () => {
  const [standaloneQuery, setStandaloneQuery] = React.useState("")
  const [integratedQuery, setIntegratedQuery] = React.useState("")

  // Filter results by query for the integrated bar
  const filteredResults = integratedQuery
    ? ALL_RESULTS.filter(
        (r) =>
          r.title.toLowerCase().includes(integratedQuery.toLowerCase()) ||
          r.semantic?.toLowerCase().includes(integratedQuery.toLowerCase()),
      )
    : ALL_RESULTS

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
          </div>
        </section>
      </div>
    </main>
  )
}

export const Route = createFileRoute("/ui-demo")({
  component: DemoPage,
})
