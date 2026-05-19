import { createFileRoute, redirect } from "@tanstack/react-router"
import { useMemo, useRef, useState } from "react"


import { Button } from "#/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import { Separator } from "#/components/ui/separator"
import { getServerSession } from "#/lib/auth-server"
import { astarFunction } from "#/server/astar.functions"
import { getAllRoomsData, getRoomWithNodesData } from "#/server/room.functions"

import type { RoutePreference } from "#/types/navigation"

interface Sample {
  i: number
  roundTripMs: number
  algorithmMs: number
  overheadMs: number
  pathLen: number
  encodedBytes: number | null
  decodedBytes: number | null
  transferBytes: number | null
}

interface Stats {
  n: number
  min: number
  median: number
  p95: number
  max: number
  mean: number
  stddev: number
}

const stats = (xs: number[]): Stats | null => {
  if (xs.length === 0) return null
  const sorted = [...xs].sort((a, b) => a - b)
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length
  const variance = sorted.reduce((s, x) => s + (x - mean) ** 2, 0) / sorted.length
  return {
    n: sorted.length,
    min: sorted[0],
    median: q(0.5),
    p95: q(0.95),
    max: sorted[sorted.length - 1],
    mean,
    stddev: Math.sqrt(variance),
  }
}

const fmt = (n: number | null | undefined, digits = 2) => (n == null ? "—" : n.toFixed(digits))

const BenchPage = () => {
  const [startRoomNo, setStartRoomNo] = useState("1.47")
  const [destRoomNo, setDestRoomNo] = useState("2.2.122")
  const [profile, setProfile] = useState<RoutePreference>("SIMPLE")
  const [runs, setRuns] = useState(30)
  const [warmups, setWarmups] = useState(3)
  const [samples, setSamples] = useState<Sample[]>([])
  const [status, setStatus] = useState<string>("idle")
  const [running, setRunning] = useState(false)
  const cancelRef = useRef(false)

  const run = async () => {
    cancelRef.current = false
    setRunning(true)
    setSamples([])
    try {
      setStatus("looking up rooms…")
      const rooms = await getAllRoomsData()
      const startRoom = rooms.find((r) => r.roomNumber === startRoomNo)
      const destRoom = rooms.find((r) => r.roomNumber === destRoomNo)
      if (!startRoom) {
        setStatus(`start room "${startRoomNo}" not found`)
        return
      }
      if (!destRoom) {
        setStatus(`dest room "${destRoomNo}" not found`)
        return
      }

      setStatus("fetching room nodes…")
      const [startFull, destFull] = await Promise.all([
        getRoomWithNodesData({ data: { id: startRoom.id } }),
        getRoomWithNodesData({ data: { id: destRoom.id } }),
      ])
      if (!startFull || !destFull) {
        setStatus("getRoomWithNodes returned null")
        return
      }
      if (startFull.nodes.length === 0) {
        setStatus(`start room "${startRoomNo}" has no nodes`)
        return
      }

      // Deterministic start: first node attached to the start room.
      const start = startFull.nodes[0]
      const dest = destFull

      setStatus(`warming up (${warmups} iterations)…`)
      for (let i = 0; i < warmups; i++) {
        if (cancelRef.current) return
        await astarFunction({ data: { profile, start, dest } })
      }

      const collected: Sample[] = []
      for (let i = 0; i < runs; i++) {
        if (cancelRef.current) {
          setStatus("cancelled")
          return
        }
        setStatus(`run ${i + 1} / ${runs}`)

        const before = performance.getEntriesByType("resource").length
        const t0 = performance.now()
        const { path, metrics } = await astarFunction({
          data: { profile, start, dest },
        })
        const rt = performance.now() - t0

        const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[]
        const fresh = entries.slice(before).find((e) => e.name.includes("_serverFn"))

        collected.push({
          i: i + 1,
          roundTripMs: rt,
          algorithmMs: metrics.durationMs,
          overheadMs: rt - metrics.durationMs,
          pathLen: path?.length ?? 0,
          encodedBytes: fresh?.encodedBodySize ?? null,
          decodedBytes: fresh?.decodedBodySize ?? null,
          transferBytes: fresh?.transferSize ?? null,
        })
        setSamples([...collected])
      }
      setStatus(`done — ${collected.length} samples`)
    } catch (err) {
      setStatus(`error: ${(err as Error).message}`)
    } finally {
      setRunning(false)
    }
  }

  const cancel = () => {
    cancelRef.current = true
  }

  const algoStats = useMemo(() => stats(samples.map((s) => s.algorithmMs)), [samples])
  const rtStats = useMemo(() => stats(samples.map((s) => s.roundTripMs)), [samples])
  const overheadStats = useMemo(() => stats(samples.map((s) => s.overheadMs)), [samples])

  const toCsv = () => {
    const header =
      "i,roundTripMs,algorithmMs,overheadMs,pathLen,encodedBytes,decodedBytes,transferBytes"
    const rows = samples.map(
      (s) =>
        `${s.i},${s.roundTripMs.toFixed(3)},${s.algorithmMs.toFixed(3)},${s.overheadMs.toFixed(
          3,
        )},${s.pathLen},${s.encodedBytes ?? ""},${s.decodedBytes ?? ""},${s.transferBytes ?? ""}`,
    )
    return [header, ...rows].join("\n")
  }

  const downloadCsv = () => {
    const blob = new Blob([toCsv()], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `astar-bench-${startRoomNo}-to-${destRoomNo}-${profile}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyCsv = async () => {
    await navigator.clipboard.writeText(toCsv())
    setStatus("CSV copied to clipboard")
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-xl font-semibold tracking-tight">A* benchmark</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="start">Start room</Label>
              <Input
                id="start"
                value={startRoomNo}
                onChange={(e) => {
                  setStartRoomNo(e.target.value)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dest">Dest room</Label>
              <Input
                id="dest"
                value={destRoomNo}
                onChange={(e) => {
                  setDestRoomNo(e.target.value)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile">Profile</Label>
              <Select
                value={profile}
                onValueChange={(v) => {
                  if (v) setProfile(v)
                }}
              >
                <SelectTrigger id="profile" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIMPLE">SIMPLE</SelectItem>
                  <SelectItem value="FAST">FAST</SelectItem>
                  <SelectItem value="ACCESSIBLE">ACCESSIBLE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="runs">Runs</Label>
              <Input
                id="runs"
                type="number"
                min={1}
                value={runs}
                onChange={(e) => {
                  setRuns(Math.max(1, Number(e.target.value)))
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warmups">Warm-up</Label>
              <Input
                id="warmups"
                type="number"
                min={0}
                value={warmups}
                onChange={(e) => {
                  setWarmups(Math.max(0, Number(e.target.value)))
                }}
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={run} disabled={running}>
              {running ? "Running…" : "Run benchmark"}
            </Button>
            <Button variant="outline" onClick={cancel} disabled={!running}>
              Cancel
            </Button>
            <Button variant="outline" onClick={copyCsv} disabled={samples.length === 0}>
              Copy CSV
            </Button>
            <Button variant="outline" onClick={downloadCsv} disabled={samples.length === 0}>
              Download CSV
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Status:</span> {status}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Algorithm" suffix="ms" tone="primary" s={algoStats} />
        <StatCard label="Round-trip" suffix="ms" s={rtStats} />
        <StatCard label="Overhead" suffix="ms" tone="muted" s={overheadStats} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsTable
            rows={[
              ["algorithm (ms)", algoStats],
              ["round-trip (ms)", rtStats],
              ["overhead (ms)", overheadStats],
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Samples ({samples.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b text-muted-foreground">
                <Th className="text-left">#</Th>
                <Th>RT (ms)</Th>
                <Th>algo (ms)</Th>
                <Th>overhead (ms)</Th>
                <Th>path</Th>
                <Th>encoded (B)</Th>
                <Th>decoded (B)</Th>
              </tr>
            </thead>
            <tbody>
              {samples.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No samples yet. Configure and run the benchmark above.
                  </td>
                </tr>
              ) : (
                samples.map((s) => (
                  <tr key={s.i} className="border-b last:border-b-0 hover:bg-muted/40">
                    <Td className="text-left font-medium">{s.i}</Td>
                    <Td>{fmt(s.roundTripMs)}</Td>
                    <Td>{fmt(s.algorithmMs)}</Td>
                    <Td>{fmt(s.overheadMs)}</Td>
                    <Td>{s.pathLen}</Td>
                    <Td>{s.encodedBytes ?? "—"}</Td>
                    <Td>{s.decodedBytes ?? "—"}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

const Th = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <th className={`px-3 py-2 text-right text-xs font-medium uppercase tracking-wide ${className}`}>
    {children}
  </th>
)

const Td = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <td className={`px-3 py-1.5 text-right ${className}`}>{children}</td>
)

interface StatCardProps {
  label: string
  suffix: string
  s: Stats | null
  tone?: "primary" | "muted"
}

const StatCard = ({ label, suffix, s, tone }: StatCardProps) => {
  const accent =
    tone === "primary" ? "border-primary/40 bg-primary/5" : tone === "muted" ? "bg-muted/30" : ""
  return (
    <Card className={accent}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tabular-nums">{fmt(s?.median)}</span>
          <span className="text-sm text-muted-foreground">{suffix} median</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs tabular-nums text-muted-foreground">
          <Stat label="p95" value={fmt(s?.p95)} />
          <Stat label="max" value={fmt(s?.max)} />
          <Stat label="σ" value={fmt(s?.stddev)} />
        </div>
      </CardContent>
    </Card>
  )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-0.5">
    <div className="text-[10px] uppercase tracking-wide">{label}</div>
    <div className="font-medium text-foreground">{value}</div>
  </div>
)

export const Route = createFileRoute("/bench")({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (session?.user.username !== "admin") {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" })
    }
  },
  component: BenchPage,
})

interface StatsTableProps {
  rows: [string, Stats | null][]
}

const StatsTable = ({ rows }: StatsTableProps) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="border-b text-muted-foreground">
          <Th className="text-left">metric</Th>
          <Th>n</Th>
          <Th>min</Th>
          <Th>median</Th>
          <Th>p95</Th>
          <Th>max</Th>
          <Th>mean</Th>
          <Th>σ</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, s]) => (
          <tr key={label} className="border-b last:border-b-0">
            <Td className="text-left font-medium">{label}</Td>
            <Td>{s?.n ?? "—"}</Td>
            <Td>{fmt(s?.min)}</Td>
            <Td>{fmt(s?.median)}</Td>
            <Td>{fmt(s?.p95)}</Td>
            <Td>{fmt(s?.max)}</Td>
            <Td>{fmt(s?.mean)}</Td>
            <Td>{fmt(s?.stddev)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
