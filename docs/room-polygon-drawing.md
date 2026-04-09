# Room Polygon Drawing — Design

> Admin feature for drawing closed room polygons on the active floor plan, validating against existing rooms, and persisting them with metadata. First feature in a series of map-editing tools — navigation nodes and edges follow next, and reuse most of the interaction primitives introduced here.

## Status

| Decision                                   | Status                                                          | Date       |
| ------------------------------------------ | --------------------------------------------------------------- | ---------- |
| PostGIS SRID                               | SRID 0 (local Cartesian)                                        | 2026-04-07 |
| Coordinate frame                           | Per-floor frame, decoupled from image (image is just a raster)  | 2026-04-07 |
| Storage units                              | Meters as IEEE-754 doubles (PostGIS native)                     | 2026-04-07 |
| Room → Floor association                   | FK from `Room.floor` → `FloorPlan.floor`                        | 2026-04-07 |
| Node → Floor association                   | Front-loaded in this PBI's migration                            | 2026-04-07 |
| Build order                                | Generic vertex/edge primitives first, then polygon-specific     | 2026-04-07 |
| Draw-mode camera                           | Locks to 2D top-down while drawing                              | 2026-04-07 |
| Color coding                               | By room type, palette defined per type enum                     | 2026-04-07 |
| Snap-to-vertex                             | Required, default radius 0.5 m, configurable later              | 2026-04-07 |
| Save flow                                  | Immediate save on form submit (no batched/publish phase)        | 2026-04-07 |
| Vertex count cap                           | Unbounded                                                       | 2026-04-07 |
| Metadata UX surface                        | shadcn `Sheet` (right side), reused for room edit + future node | 2026-04-07 |
| Render rooms on stacked floors in 3D       | In scope (faded for non-active floors, like floor planes)       | 2026-04-07 |
| Edit existing room metadata                | In scope via the Sheet (small extension, same form as create)   | 2026-04-07 |
| Definitive room type list                  | Initial seed list now, will iterate later                       | 2026-04-07 |

## Goal

Allow an authenticated administrator to draw a closed polygon on the active floor plan in the Three.js scene, validate it against existing rooms on the same floor, attach minimal metadata (room number, name, type), and save it to PostGIS. Saved rooms render on the canvas as filled, outlined, labelled meshes — coloured by room type.

The metadata form lives in a shadcn `Sheet` that slides in from the right. The same Sheet is later used for editing existing rooms and (in the next PBI) for placing/editing nodes — including manual coordinate entry.

This is the first piece of admin map-editing UI. The vertex placement, snapping, and rendering primitives introduced here are designed for reuse: room polygons now, navigation nodes/edges next, and eventually the user-facing route highlight.

## Source documents

- PBI: "Draw Room Polygons" (formal description provided 2026-04-07)
- Project report: data-model section, Algorithm 1 (room overlap), Algorithm 3 (edge creation)
- Existing code references in [References](#references)

## Scope

### In scope

- Toolbar toggle to enter/exit "draw room" mode (gated by auth)
- Camera locks to top-down 2D while a draw tool is active; previous render mode restored on exit
- Click-to-place vertices on the active floor plane via raycasting
- Live polyline + cursor preview edge while drawing
- Snap-to-vertex against existing room corners on the same floor (default 0.5 m radius)
- Undo last vertex; cancel in-progress polygon
- Close polygon by clicking the first vertex or pressing "Finish"
- Self-intersection rejection
- Overlap-against-existing-rooms rejection (interior overlap rejected; shared edges/corners allowed)
- Metadata form in a `Sheet` (room number, display name, room type) on valid closure, with Save/Revert
- Editing the metadata of an already-saved room via the same `Sheet` (small extension — same form, same fields)
- Persisted rooms rendered as filled meshes with outline and label, coloured by room type
- Saved rooms on **all** floors visible in 3D mode (faded for non-active floors, mirroring how `floor-plane` already fades)
- Selecting and deleting an existing room (with confirmation)

### Out of scope (this PBI)

- Editing the **vertices** of an already-saved room polygon (only metadata is editable here)
- Navigation node or edge placement (next PBI — but interaction primitives and the Sheet UI are designed to support it)
- Importing room boundaries from external sources (e.g. GeoJSON, IFC)
- Cross-floor coordinate registration / aligning floor frames in real-world space (each floor has its own frame)
- Re-uploading a floor plan image and re-aligning it to existing rooms (the storage decoupling sets us up for this, but the tooling is a separate PBI)

## Decisions

### PostGIS SRID 0

**What.** All spatial geometry columns use `geometry(..., 0)` — no coordinate reference system declared, raw Cartesian. Applies to `Room.polygon`, `Room.pointZ`, `Room.multiPolygon`, and the (front-loaded) `Node.point`.

**Why.** Coordinates are local meters in a per-floor Cartesian frame. They are not georeferenced. SRID 0 gives:

- `ST_Distance(a, b)` returns meters directly.
- `ST_Area(polygon)` returns m².
- `ST_Overlaps`, `ST_Touches`, `ST_Relate` work as topology functions on raw coordinates with no projection assumptions.
- Zero risk of the `geography(...)` footgun where local meters get reinterpreted as lat/lon degrees.

SRID 4326 (the current schema default) was rejected because the data is not lat/lon and the schema would mislead. A custom projected SRID was rejected as overkill for an indoor-only model.

### Per-floor coordinate frame, decoupled from the image

**What.** Each floor has its own stable Cartesian coordinate frame. Floor coordinates are the source of truth for rooms and nodes. The floor plan **image is just a raster rendered into that frame** — it can be swapped, re-uploaded, or recalibrated without touching room data.

**Frame definition (current).** Origin at world (0, 0), X right, Y forward (in floor-plane terms; Three.js Y-up is the floor stacking axis). Units: meters. The first calibration of a floor establishes the scale; the floor plane is rendered centered at the world origin for that floor's Y level, sized by image dimensions × `calibrationScale`. So today, the floor frame and the image's centered span happen to coincide — but that's a rendering coincidence, not a data dependency.

**Why this decoupling matters.** The user surfaced this and they're right: if room polygons were stored in image-pixel space (or in any frame derived from the current image's geometry), then re-uploading a higher-resolution scan, fixing a slightly skewed image, or replacing a placeholder with a real plan would shift every existing room. Storing in a stable floor frame means image replacement is purely a re-registration of the **raster** into the existing frame — data is untouched.

**Implication for the existing calibration tool.** Today, `calibrate-floor-form.tsx` only captures *scale* (meters per pixel). That's enough as long as the floor frame is anchored to the image's centered span at upload time. When we later need to swap an image, we'll extend the calibration tool to also capture *translation* (and possibly rotation) so the new image lands in the existing frame. That extension is a separate PBI; we don't need it now. The important thing is that the data model is already shaped for it.

**A note on the rendering convention.** The floor plane is centered at world origin, so click coordinates are negative in two quadrants. That's fine — meters can be negative, and PostGIS doesn't care. We do **not** translate to put the origin at a corner; that would just add a mapping with no benefit.

### Storage units: meters as IEEE-754 doubles

**What.** Stored polygon vertices are double-precision floats representing meters in the floor frame. Same unit, same column type, no scaling.

**Why not centimeters as integers?** It looks tempting for "precision," but it doesn't actually buy precision in PostGIS. PostGIS geometry columns store coordinates as IEEE-754 doubles regardless of what units you intend. Storing `1234` instead of `12.34` doesn't change the storage type — it just shifts the decimal. The "integer in cm" idea would also force every read site to remember to divide by 100, every write site to multiply, and `ST_Distance` would return centimeters instead of meters. That's exactly the kind of mapping the simplicity preference rules out.

The drift concern is real but tiny: doubles give ~15 significant digits, which is sub-nanometer precision for room-sized polygons. The places where exact equality might matter (snap-to-vertex, "did we click the first vertex to close?") are handled by an explicit **snap radius** (0.5 m default), not by float equality. Snap radius is the right tool; integer scaling is a workaround for a problem we don't have.

### Room → Floor relation (and front-loaded Node → Floor)

**What.** `Room.floor` is an `Int` with an FK to `FloorPlan.floor`. Same shape on `Node`, added in this PBI's migration even though the node-drawing UI lands in the next PBI.

**Why.** A polygon (or a node) is meaningless without knowing which floor's coordinate frame it lives in. A real FK gives DB-level integrity. Front-loading `Node.floor` keeps the mental model consistent (every spatial entity knows its floor) and avoids a second migration on the next PBI.

**Navigability the user asked about.** This unlocks the natural traversal:
`FloorPlan → rooms on that floor → nodes belonging to those rooms`. Combined with the existing `Room.nodes` relation, you get `floorPlan.rooms[].nodes[]` for free. And independently, `floorPlan.nodes[]` gives every node on a floor regardless of room (corridors, stairwells, etc.). Both are useful.

### Build order: generic primitives first

**Decided.** Phase 1 builds tool-agnostic primitives (`useCanvasPointer`, `useSnapToExisting`, `<VertexMarker>`, `<EdgePreview>`). Phase 3 composes them into a polygon-specific hook. The next PBI gets node and edge tools mostly for free — same primitives, different `onConfirm`.

The user explicitly identified the shared abstraction in the original request ("the connection logic is also shared… for nodes it's just an edge at a time, for polygons it's until the area is closed"). With that alignment, building primitives first is the *simpler* path overall — not the more clever one — because the alternative is rewriting half of it during the next PBI.

### Color coding by room type

**What.** Each `RoomType` enum value gets a fill colour (with a slightly darker outline). All meeting rooms one colour, all offices another, etc. Colours are defined in a single map alongside the enum so adding a type adds a colour.

**Why.** Cognitive offloading — the report explicitly calls this out as a usability pattern, and 75% of survey respondents reported floor/room confusion. Colour-by-type lets an admin (and later a user) glance at the map and know what kind of space they're looking at without reading every label.

**Initial palette (placeholder, will iterate).** Defined in a shared `roomTypeStyles.ts`:

| Type           | Fill (oklch / hex)  | Notes                          |
| -------------- | ------------------- | ------------------------------ |
| `CLASSROOM`    | warm amber          | high-frequency, easy to spot   |
| `MEETING_ROOM` | cool blue           | distinct from classrooms       |
| `OFFICE`       | muted slate         | de-emphasised, many of them    |
| `STUDY_SPACE`  | soft green          | "stay here" cue                |
| `AUDITORIUM`   | deep purple         | rare, stands out               |
| `LIBRARY`      | warm brown          | matches AAU brand neutrals     |
| `FOOD_DRINK`   | red-orange          | matches existing Coffee icon   |
| `FACILITY`     | desaturated grey    | toilets, storage, mechanical   |
| `DEFAULT`      | neutral grey-blue   | fallback                       |

Concrete colour values picked when implementing — they should sit alongside the existing oklch theme tokens in `styles.css` so dark mode is handled.

### Snap-to-vertex (required)

**What.** While placing a vertex, the cursor snaps to the nearest existing room corner (any room on the same floor) within a configurable radius. Default radius: **0.5 m**. A snap target is visually highlighted before commit.

**Why.** Adjacent rooms share walls, and a "shared wall" only counts as shared if the corner coordinates are *exactly* equal (or near enough that the topology check sees them as touching). Without snapping, the admin would have to align corners by eye to sub-cm precision, which is impossible at any reasonable zoom. Snap-to-vertex makes shared walls a one-click operation and keeps the room-overlap check from rejecting "almost-touching" cases.

**Implementation.** `useSnapToExisting(targets, radius)` is a Phase 1 primitive. For polygon drawing, `targets` is the set of all corners from existing-room polygons on the active floor. For the next PBI, `targets` becomes the set of existing nodes — same hook, different inputs.

### Camera locks to 2D while drawing

**What.** Activating a draw tool sets `renderMode = '2d'` and disables the 2D/3D toggle in the toolbar. Exiting the tool restores the previous mode.

**Why.** Vertex placement is a flat operation on a flat surface. An oblique camera angle introduces parallax that makes "click on the first vertex to close" finicky and makes raycast hits feel imprecise. Locking to top-down removes the ambiguity. We can revisit if there's demand for oblique drawing later.

### Save flow: immediate

Save on form submit. No batched/publish step. Simpler, fine for an admin who is editing one thing at a time.

### Vertex count: unbounded

No artificial cap. Hand-drawn polygons stay small in practice; complexity is bounded by patience.

### Metadata UX: shadcn `Sheet`

**What.** A shadcn `Sheet` slides in from the right when a room polygon is closed. It hosts the metadata form (room number, display name, room type, floor — read-only). Save/Revert buttons in the footer. Cancelling the Sheet discards the in-progress polygon.

**Why.** A side panel keeps the canvas visible during form entry — the admin can see the polygon they just drew while filling in metadata, and snap a quick sanity check on the geometry. It also generalises: the same Sheet shows up to edit an existing room's metadata, and the next PBI uses it to host node-editing fields including manual coordinate entry.

**Status.** Already installed (`src/components/ui/sheet.tsx`). Ready to import in Phase 2.

## Schema changes

```prisma
model Room {
  // existing fields preserved
  id            String   @id @default(cuid())
  isActivated   Boolean  @default(true)
  semanticNames String[]
  type          RoomType
  sectionId     String?
  section       Section? @relation(fields: [sectionId], references: [id])
  nodes         Node[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // new
  floor     Int
  floorPlan FloorPlan @relation(fields: [floor], references: [floor])

  // changed: SRID 4326 -> SRID 0
  polygon      Unsupported("geometry(Polygon, 0)")?
  pointZ       Unsupported("geometry(PointZ, 0)")?
  multiPolygon Unsupported("geometry(MultiPolygon, 0)")?

  @@index([sectionId])
  @@index([type])
  @@index([isActivated])
  @@index([floor])
}

model Node {
  // existing fields preserved
  id          String   @id @default(cuid())
  x           Float
  y           Float
  z           Float
  type        NodeType
  isActivated Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  roomId      String?
  room        Room?    @relation(fields: [roomId], references: [id], onDelete: SetNull)
  edgesFrom   Edge[]   @relation("EdgeFromNode")
  edgesTo     Edge[]   @relation("EdgeToNode")

  // new (front-loaded — used by next PBI)
  floor     Int
  floorPlan FloorPlan @relation(fields: [floor], references: [floor])

  @@index([roomId])
  @@index([type])
  @@index([isActivated])
  @@index([x, y, z])
  @@index([floor])
}

model FloorPlan {
  // existing
  floor            Int      @id @unique
  path             String
  calibrationScale Float    @default(1.0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // new back-relations
  rooms Room[]
  nodes Node[]
}
```

Initial seed for `RoomType` (will iterate):

```prisma
enum RoomType {
  DEFAULT
  CLASSROOM
  MEETING_ROOM
  OFFICE
  STUDY_SPACE
  AUDITORIUM
  LIBRARY
  FOOD_DRINK
  FACILITY
}
```

Migration plan (single Prisma migration):

1. `ALTER TABLE "Room" ADD COLUMN "floor" INTEGER;` and `ALTER TABLE "Node" ADD COLUMN "floor" INTEGER;` — both nullable initially.
2. No backfill needed (tables are empty in current dev DBs). If any rows exist, they'd need a chosen floor; for now we assume empty.
3. `ALTER TABLE ... ALTER COLUMN "floor" SET NOT NULL;` and add the FKs to `FloorPlan(floor)`.
4. Drop and recreate `polygon`, `pointZ`, `multiPolygon` with SRID 0 (no data to preserve).
5. Add `@@index([floor])` on both tables.
6. Extend the `RoomType` enum with the seed values above.

## Coordinate system mental model

```
Floor 1 (its own frame)              Floor 2 (its own frame)
  Y                                    Y
  ^                                    ^
  |   . . . . . . . . . . .            |   . . . . . . . . . . .
  |   .  raster image     .            |   .  raster image     .
  |   .  (visual only)    .            |   .  (visual only)    .
  |   .                   .            |   .                   .
  |   .  +--------+       .            |   .       +-------+   .
  |   .  | room A |       .            |   .       |room B |   .
  |   .  +--------+       .            |   .       +-------+   .
  |   . . . . . . . . . . .            |   . . . . . . . . . . .
  +-----------------------> X          +-----------------------> X
  origin = floor frame origin          origin = floor frame origin
  (rooms are stored here,              (image is positioned in the
   image just renders into it)          frame, can be re-registered)
```

- Each `FloorPlan` has its own stable Cartesian frame. Origin at world (0, 0). X right, Y forward. Units: meters.
- The floor plan image is rendered into this frame as a textured plane. It is not the source of truth — the floor frame is.
- `FloorPlan.calibrationScale` is currently meters per pixel of the source image, used to size the rendered plane. When the calibration tool is later extended to support image replacement, additional translation/rotation parameters will be added.
- Stored polygon vertices are pairs of doubles in meters in the floor frame.
- Within a floor: `ST_Distance`, `ST_Area`, `ST_Length`, overlap checks all return meters / m².
- Across floors: floors are not assumed to share a frame. Cross-floor connectivity happens via dedicated stair/elevator nodes with edges whose cost is the vertical floor distance — exactly the model in the report's Algorithm 3.

## Architecture (phased)

### Phase 0 — Schema prerequisites (blocking)

- Add `floor` to `Room` and `Node` with FKs.
- Switch geometry columns to SRID 0.
- Extend `RoomType` enum with seed values.
- Verify PostGIS extension is enabled in the migration.

### Phase 1 — Interaction primitives (designed for reuse)

Tool-agnostic so the next PBI (nodes/edges) reuses them with minimal change:

- An invisible raycast plane parented to the active floor at its Y level, sized to the floor extent.
- `useCanvasPointer()` hook — yields world-space hits on click, with click-vs-drag disambiguation so OrbitControls drag still pans/rotates.
- `<VertexMarker>` and `<EdgePreview>` components — purely visual. Take a list of points/segments + style props (colour, radius). **Reused for**:
  - In-progress room polygon vertices and edges (this PBI)
  - Outline of saved room polygons (this PBI, layered over the fill mesh)
  - Node markers and connecting edges (next PBI)
  - The user-facing navigation route highlight (later)
- `useSnapToExisting(targets, radius)` hook — given existing vertex positions and a radius in meters, returns the nearest snap target or null. Used by polygon corner snapping; later by node reuse.

### Phase 2 — Edit mode shell + admin toolbar

- Extend `MapContext` (`src/lib/map-context.tsx`) with:
  ```ts
  type ActiveTool = 'draw-room' | 'edit-room' | 'draw-node' | 'connect-edge' | null
  activeTool: ActiveTool
  setActiveTool: (tool: ActiveTool) => void
  ```
  Only `'draw-room'` and `'edit-room'` are wired in this PBI. The other variants are reserved for the next PBI so the type doesn't have to change again.
- New `<AdminToolbar>` rendered conditionally for authenticated users on `/`. Shows the active tool, undo, finish, cancel buttons.
- Cursor change + status pill when a tool is active.
- Activating any draw tool forces `renderMode = '2d'` and disables the mode toggle. Deactivating restores the previous mode.
- Edit mode lives on `/` rather than a separate route — the canvas is the interaction surface.

### Phase 3 — Polygon drawing flow

- `useRoomDrawing()` hook composes the Phase 1 primitives.
- Owns in-progress vertex list in client state. Never touches the DB until the Sheet's Save is pressed.
- Live polyline using `THREE.Line`. Cursor preview edge to the current pointer position.
- Snap-to-vertex active continuously; visual highlight on the snap target.
- Click-on-first-vertex closes the loop. "Finish" toolbar button is the alternate.
- Undo, cancel, minimum-vertex check (≥ 3).
- On valid closure, the metadata `Sheet` opens (Phase 5) with the polygon kept in client state — Revert in the Sheet returns to drawing without losing the geometry; Cancel discards it.

### Phase 4 — Validation

Two layers, both required:

| Layer  | Purpose                       | Implementation                                                            |
| ------ | ----------------------------- | ------------------------------------------------------------------------- |
| Client | Instant feedback while drawing | `@turf/boolean-overlap` + `@turf/boolean-disjoint` + custom self-intersect check |
| Server | Authoritative on save         | PostGIS `ST_IsValid` + `ST_Relate(new, existing, 'T********')`            |

`ST_Relate` with the DE-9IM mask `'T********'` matches "the interiors of the two polygons share at least one point" — i.e. interior overlap. Shared edges and corners (boundary-only contact) don't match this pattern, so they pass.

Errors render in the `Sheet` and toolbar, naming the offending room ("Overlaps with room 2.01") or the reason ("Polygon is self-intersecting"). The in-progress polygon stays editable so the admin can adjust rather than start over.

### Phase 5 — Save flow + metadata Sheet

- Right-side `Sheet` opens after valid closure.
- Form built with `@tanstack/react-form`, mirroring the pattern in `src/components/forms/calibrate-floor-form.tsx`.
- Fields: `roomNumber` (required), `displayName` (required), `type` (`Select` with the `RoomType` enum), `floor` (auto-filled from `currentFloor`, read-only).
- Footer: **Save** (validates, runs server-side overlap check, commits) and **Revert** (returns to drawing with polygon intact). The Sheet's close action prompts to discard.
- Server function `createRoom()` using `createServerFn()` + Zod, writes the polygon as WKT through `prisma.$queryRaw`:
  ```ts
  await prisma.$executeRaw`
    INSERT INTO "Room" (id, "displayName", "roomNumber", type, floor, polygon)
    VALUES (
      ${id}, ${displayName}, ${roomNumber}, ${type}, ${floor},
      ST_GeomFromText(${wkt}, 0)
    )
  `;
  ```
- The same Sheet, with the same form, opens for **editing an existing room's metadata** when the admin selects a saved room and chooses "Edit" — the only difference is which mutation the form submits to. This is the small scope extension surfaced during review.

### Phase 6 — Render saved rooms

- New `<RoomPolygonsLayer>` in the Three.js scene, fetches rooms via React Query (`getRoomsByFloor()` returns vertices as JSON or GeoJSON via `ST_AsGeoJSON`).
- Each room: `THREE.ShapeGeometry` (fill, semi-transparent, colour from `roomTypeStyles[type].fill`) + `<EdgePreview>` outline (colour from `roomTypeStyles[type].outline`) at the floor's Y plane with a small Y offset to avoid z-fighting.
- Labels via `CSS2DRenderer` — simpler text styling than sprites, supports CSS hover/selection states.
- **All floors render in 3D mode**: rooms on non-active floors fade with the same opacity rule as the floor planes (`camera-rig.tsx` already computes `neighbourOpacity`). In 2D mode, only the active floor's rooms render.
- Existing rooms remain visible while drawing a new one so overlap is visually obvious.

### Phase 7 — Select + delete + edit

- Pointer raycast against room meshes when no draw tool is active.
- Selected room gets an outline highlight.
- Toolbar actions on selection: **Edit metadata** (opens the Sheet in edit mode) and **Delete** (with `AlertDialog` confirmation, mirroring the upload-overwrite dialog in the existing import form).
- Server functions: `updateRoomMetadata(id, fields)`, `deleteRoom(id)`.

## Validation algorithm details

### Self-intersection (client-side)

For a polygon with vertices `v[0..n-1]`, check every pair of non-adjacent edges `(v[i], v[i+1])` and `(v[j], v[j+1])` where `|i - j| > 1` and not the wrap-around adjacency. Standard segment-segment intersection. O(n²) is fine for hand-drawn polygons (n is small).

### Overlap with existing rooms (client-side)

```
for each existing room R on the same floor:
  if not boolean-disjoint(new, R):
    if boolean-overlap(new, R) OR new is contained in R OR R is contained in new:
      reject with R's room number
    // else: touches only (shared edge / corner) — allowed
```

### Server-side authoritative check

```sql
-- reject if invalid (self-intersecting, etc.)
SELECT ST_IsValid(ST_GeomFromText($1, 0));

-- reject if interior of new polygon shares any points with interior of an existing room on the same floor
SELECT id, "roomNumber" FROM "Room"
WHERE floor = $2
  AND ST_Relate(polygon, ST_GeomFromText($1, 0), 'T********');
```

If either check fails, return a structured error to the client and do not insert.

## Open questions

The big ones are decided. Remaining items can be settled during implementation without blocking design:

1. **Concrete colour values for the seed `RoomType` palette** — pick on first implementation pass, in `oklch()` to match the existing theme tokens in `src/styles.css`.
2. **Snap radius default** — 0.5 m is a reasonable starting point; may want to adjust after first hands-on use.
3. **Label placement** — centroid is the easy choice; for L-shaped rooms the centroid can fall outside the polygon. Can fall back to `ST_PointOnSurface` from PostGIS if it becomes a problem.

## References

- Existing scene: `src/components/threeJS/map-scene.tsx`
- Floor plane rendering & calibration scale: `src/components/threeJS/floor-plane.tsx`
- Scene constants (FLOOR_HEIGHT, BASE_HEIGHT, polar angles): `src/components/threeJS/constants.ts`
- Camera rig and floor opacity logic (reused for fading non-active floor rooms in 3D): `src/components/threeJS/camera-rig.tsx`
- Map state (currentFloor, renderMode — extended with activeTool here): `src/lib/map-context.tsx`
- Schema: `prisma/schema.prisma`
- Existing graph operations (reused for the next PBI): `src/server/graph.server.ts`
- Admin form pattern (mirror this for the metadata form): `src/components/forms/calibrate-floor-form.tsx`
- Existing admin route: `src/routes/manage-floor.tsx`
- shadcn `Sheet` (already installed): `src/components/ui/sheet.tsx`
