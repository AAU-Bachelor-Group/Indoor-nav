import { describe, it, expect, beforeEach, vi } from "vitest"

import { Graph } from "./graph.server"

import type { Node, Edge } from "#/generated/prisma/client"
import type { AstarInput } from "#/types/navigation"

// vi.hoisted runs before vi.mock factories, making graphRef safe to close over
const graphRef = vi.hoisted(() => ({ current: null as unknown as Graph }))

// Prevent the real db module from running (no database in tests)
vi.mock("#/db", () => ({ prisma: {} }))

vi.mock("./graph.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./graph.server")>()
  graphRef.current = new actual.Graph([], [])
  return {
    ...actual,
    getGraph: () => Promise.resolve(graphRef.current),
  }
})

// Dynamic import so the module-level const graph = await getGraph() in
// astar.server.ts runs after the mock is in place
const { astar } = await import("./astar.server")

// Helpers

function makeNode(id: string, x: number, y: number, overrides: Partial<Node> = {}): Node {
  return {
    id,
    x,
    y,
    z: 0,
    floor: 1,
    type: "DEFAULT",
    isActivated: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    roomId: null,
    ...overrides,
  }
}

function makeEdge(
  fromNodeId: string,
  toNodeId: string,
  distance: number,
  overrides: Partial<Edge> = {},
): Edge {
  return {
    id: `${fromNodeId}->${toNodeId}`,
    fromNodeId,
    toNodeId,
    distance,
    doors: false,
    stairs: false,
    elevators: false,
    isActivated: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeDest(nodes: Node[]): AstarInput["dest"] {
  return {
    id: "room-1",
    roomNumber: "101",
    displayName: null,
    isActivated: true,
    type: "DEFAULT",
    createdAt: new Date(),
    updatedAt: new Date(),
    sectionId: null,
    floor: 1,
    nodes: nodes,
  }
}

function ids(path: Node[] | null): string[] | null {
  return path?.map((n) => n.id) ?? null
}

beforeEach(() => {
  for (const id of [...graphRef.current.nodes.keys()]) {
    graphRef.current.deleteNodeById(id)
  }
})

// Tests

describe("astar", () => {
  it("returns a single-node path when start is already the destination endpoint", async () => {
    const a = makeNode("a", 0, 0, { type: "ENDPOINT" })
    graphRef.current.addNode(a)

    const result = await astar("FAST", makeDest([a]), a)

    expect(ids(result)).toEqual(["a"])
  })

  it("finds a direct path between two connected nodes", async () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 10, 0, { type: "ENDPOINT" })
    graphRef.current.addNode(a)
    graphRef.current.addNode(b)
    graphRef.current.addEdge(makeEdge("a", "b", 10))

    const result = await astar("FAST", makeDest([b]), a)

    expect(ids(result)).toEqual(["a", "b"])
  })

  it("finds a path through intermediate nodes", async () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 5, 0)
    const c = makeNode("c", 10, 0, { type: "ENDPOINT" })
    graphRef.current.addNode(a)
    graphRef.current.addNode(b)
    graphRef.current.addNode(c)
    graphRef.current.addEdge(makeEdge("a", "b", 5))
    graphRef.current.addEdge(makeEdge("b", "c", 5))

    const result = await astar("FAST", makeDest([c]), a)

    expect(ids(result)).toEqual(["a", "b", "c"])
  })

  it("picks the cheaper of two routes", async () => {
    //  a ----100---- b (endpoint)
    //   \           ^
    //    1         1
    //     c -------/
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 10, 0, { type: "ENDPOINT" })
    const c = makeNode("c", 5, 0)
    graphRef.current.addNode(a)
    graphRef.current.addNode(b)
    graphRef.current.addNode(c)
    graphRef.current.addEdge(makeEdge("a", "b", 100))
    graphRef.current.addEdge(makeEdge("a", "c", 1))
    graphRef.current.addEdge(makeEdge("c", "b", 1))

    const result = await astar("FAST", makeDest([b]), a)

    expect(ids(result)).toEqual(["a", "c", "b"])
  })

  it("returns null when no path exists between start and destination", async () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 10, 0, { type: "ENDPOINT" })
    graphRef.current.addNode(a)
    graphRef.current.addNode(b)
    // No edge connecting a to b

    const result = await astar("FAST", makeDest([b]), a)

    expect(result).toBeNull()
  })

  it("returns null when the destination room has no ENDPOINT or DOOR nodes", async () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 10, 0) // type DEFAULT — not a valid destination
    graphRef.current.addNode(a)
    graphRef.current.addNode(b)
    graphRef.current.addEdge(makeEdge("a", "b", 10))

    const result = await astar("FAST", makeDest([b]), a)

    expect(result).toBeNull()
  })

  it("skips deactivated nodes", async () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 5, 0, { isActivated: false })
    const c = makeNode("c", 10, 0, { type: "ENDPOINT" })
    graphRef.current.addNode(a)
    graphRef.current.addNode(b)
    graphRef.current.addNode(c)
    graphRef.current.addEdge(makeEdge("a", "b", 5))
    graphRef.current.addEdge(makeEdge("b", "c", 5))
    // Only route to c goes through the deactivated b

    const result = await astar("FAST", makeDest([c]), a)

    expect(result).toBeNull()
  })

  it("skips deactivated edges", async () => {
    const a = makeNode("a", 0, 0)
    const b = makeNode("b", 10, 0, { type: "ENDPOINT" })
    graphRef.current.addNode(a)
    graphRef.current.addNode(b)
    graphRef.current.addEdge(makeEdge("a", "b", 10, { isActivated: false }))

    const result = await astar("FAST", makeDest([b]), a)

    expect(result).toBeNull()
  })

  it("prefers ENDPOINT over DOOR when both are in the destination room", async () => {
    const a = makeNode("a", 0, 0)
    const door = makeNode("door", 3, 0, { type: "DOOR" })
    const endpoint = makeNode("ep", 6, 0, { type: "ENDPOINT" })
    graphRef.current.addNode(a)
    graphRef.current.addNode(door)
    graphRef.current.addNode(endpoint)
    graphRef.current.addEdge(makeEdge("a", "door", 3))
    graphRef.current.addEdge(makeEdge("a", "ep", 6))

    const result = await astar("FAST", makeDest([door, endpoint]), a)

    expect(ids(result)).toEqual(["a", "ep"])
  })

  it("ACCESIBLE_ROUTE avoids STAIR nodes when crossing floors", async () => {
    const a = makeNode("a", 0, 0, { floor: 1 })
    const stair = makeNode("stair", 6, 0, { type: "STAIR", floor: 2 })
    const elevator = makeNode("elev", 5, 0, { type: "ELEVATOR", floor: 2 })
    const ep = makeNode("ep", 10, 0, { type: "ENDPOINT", floor: 2 })
    graphRef.current.addNode(a)
    graphRef.current.addNode(stair)
    graphRef.current.addNode(elevator)
    graphRef.current.addNode(ep)
    graphRef.current.addEdge(makeEdge("a", "stair", 1))
    graphRef.current.addEdge(makeEdge("stair", "ep", 1))
    graphRef.current.addEdge(makeEdge("a", "elev", 1))
    graphRef.current.addEdge(makeEdge("elev", "ep", 1))

    const result = await astar("ACCESSIBLE", makeDest([ep]), a)

    expect(ids(result)).toEqual(["a", "elev", "ep"])
  })

  it("ACCESIBLE_ROUTE allows STAIR nodes when staying on the same floor", async () => {
    const a = makeNode("a", 0, 0, { floor: 1 })
    const stair = makeNode("stair", 5, 0, { type: "STAIR", floor: 1 })
    const ep = makeNode("ep", 10, 0, { type: "ENDPOINT", floor: 1 })
    graphRef.current.addNode(a)
    graphRef.current.addNode(stair)
    graphRef.current.addNode(ep)
    graphRef.current.addEdge(makeEdge("a", "stair", 5))
    graphRef.current.addEdge(makeEdge("stair", "ep", 5))

    const result = await astar("ACCESSIBLE", makeDest([ep]), a)

    expect(ids(result)).toEqual(["a", "stair", "ep"])
  })

  it("finds the closest node when start is given as XYZ coordinates", async () => {
    const a = makeNode("a", 0, 0, { floor: 1 })
    const b = makeNode("b", 10, 0, { type: "ENDPOINT", floor: 1 })
    graphRef.current.addNode(a)
    graphRef.current.addNode(b)
    graphRef.current.addEdge(makeEdge("a", "b", 10))

    // Start point is close to 'a' — should snap to 'a' as the first node
    const result = await astar("FAST", makeDest([b]), { x: 0.5, y: 0.5, floor: 1 })

    expect(ids(result)).toEqual(["a", "b"])
  })

  it("routes through a 2643-node grid within 1 second", async () => {
    const COLS = 51
    const NODE_COUNT = 2643
    const nodes: Node[] = []

    for (let i = 0; i < NODE_COUNT; i++) {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const node = makeNode(`n${i}`, col * 2, row * 2, {
        type: i === NODE_COUNT - 1 ? "ENDPOINT" : "DEFAULT",
      })
      nodes.push(node)
      graphRef.current.addNode(node)
    }

    for (let i = 0; i < NODE_COUNT; i++) {
      const col = i % COLS
      if (col < COLS - 1 && i + 1 < NODE_COUNT) {
        graphRef.current.addEdge(makeEdge(`n${i}`, `n${i + 1}`, 2))
      }
      if (i + COLS < NODE_COUNT) {
        graphRef.current.addEdge(makeEdge(`n${i}`, `n${i + COLS}`, 2))
      }
    }

    const t0 = performance.now()
    const result = await astar("FAST", makeDest([nodes[NODE_COUNT - 1]]), nodes[0])
    const elapsed = performance.now() - t0

    expect(result).not.toBeNull()
    expect(elapsed).toBeLessThan(1000)
  }, 10_000)
})
