import crypto from "node:crypto"

import { prisma } from "#/db"

import type { RoomType } from "#/generated/prisma/enums"

/**
 * A polygon vertex in the floor's local 2D frame, projected from a
 * THREE.Vector3 (where x is the floor's right axis and z is the floor's
 * forward axis — three.js Y is the floor stacking dimension and is dropped).
 */
export interface RoomVertex {
  x: number
  z: number
}

export interface CreateRoomInput {
  roomNumber: string
  displayName?: string
  type: RoomType
  floor: number
  vertices: RoomVertex[]
}

export interface PersistedRoom {
  id: string
  roomNumber: string
  displayName?: string
  type: RoomType
  floor: number
  /**
   * Exterior-ring vertices in click order, with the GeoJSON ring closure
   * dropped (so `vertices[0] !== vertices.at(-1)`). Each entry is in the
   * floor's local 2D frame matching the projection used by createRoom.
   */
  vertices: RoomVertex[]
}

/**
 * Build a PostGIS-compatible WKT POLYGON ring from in-floor 2D vertices.
 * The ring is closed by appending the first vertex at the end.
 *
 * In the floor's local frame: vertex.x is right, vertex.z is forward.
 * Both are stored as the polygon's x/y coordinates in PostGIS (SRID 0).
 */
const buildPolygonWkt = (vertices: RoomVertex[]): string => {
  const ring = [...vertices, vertices[0]]
  const coords = ring.map((v) => `${String(v.x)} ${String(v.z)}`).join(", ")
  return `POLYGON((${coords}))`
}

/**
 * Insert a new Room with a polygon. Goes through `$queryRaw` / `$executeRaw`
 * because Prisma's `Unsupported(geometry(...))` columns can't be set through
 * the standard typed client.
 *
 * Authoritative server-side validation:
 * 1. ST_IsValid catches degenerate / self-intersecting polygons.
 * 2. ST_Relate with the DE-9IM mask 'T********' catches interior overlap
 *    with any existing room on the same floor. Shared edges and corners
 *    (boundary-only contact) don't match this pattern, so adjacent rooms
 *    that share a wall pass.
 *
 * Throws on validation failure with a human-readable message that the
 * client can surface in the metadata panel.
 */
export const createRoom = async (input: CreateRoomInput): Promise<{ id: string }> => {
  const { roomNumber, displayName, type, floor, vertices } = input

  if (vertices.length < 3) {
    throw new Error("A polygon needs at least 3 vertices")
  }

  const wkt = buildPolygonWkt(vertices)

  // 1. ST_IsValid: catches self-intersection, degenerate rings, etc.
  const validityRows = await prisma.$queryRaw<{ valid: boolean }[]>`
    SELECT ST_IsValid(ST_GeomFromText(${wkt}, 0)) AS valid
  `
  if (!validityRows[0]?.valid) {
    throw new Error("Polygon failed PostGIS ST_IsValid check")
  }

  // 2. Interior-overlap check against existing rooms on the same floor.
  //    'T********' = "interior of A intersects interior of B" — shared edges
  //    or corners (boundary-only contact) don't match.
  //
  //    The new polygon is wrapped in ST_Snap with a 1mm tolerance against
  //    each existing room's polygon. This collapses any sub-millimetre drift
  //    that may have crept in from the GeoJSON round-trip on the client side
  //    (where the user snapped a new vertex to a corner rendered from a
  //    fetched-and-reparsed value). Without this, two "shared" corners can
  //    end up off by ~1e-9m and the new edge slightly enters the existing
  //    room's interior, which ST_Relate correctly flags as overlap.
  const overlappingRows = await prisma.$queryRaw<{ id: string; roomNumber: string }[]>`
    SELECT id, "roomNumber"
    FROM "Room"
    WHERE floor = ${floor}
      AND polygon IS NOT NULL
      AND ST_Relate(
        polygon,
        ST_Snap(ST_GeomFromText(${wkt}, 0), polygon, 0.001),
        'T********'
      )
  `
  if (overlappingRows.length > 0) {
    throw new Error(`Overlaps with room ${overlappingRows[0].roomNumber}`)
  }

  // 3. Insert. updatedAt has to be set explicitly because @updatedAt is a
  //    Prisma client-side hook that doesn't run for raw SQL.
  const id = crypto.randomUUID()
  await prisma.$executeRaw`
    INSERT INTO "Room" (
      id,
      "roomNumber",
      "displayName",
      type,
      floor,
      polygon,
      "isActivated",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${roomNumber},
      ${displayName},
      CAST(${type} AS "RoomType"),
      ${floor},
      ST_GeomFromText(${wkt}, 0),
      true,
      NOW(),
      NOW()
    )
  `

  return { id }
}

interface RoomGeoJsonRow {
  id: string
  roomNumber: string
  displayName?: string
  type: RoomType
  floor: number
  polygonJson: string
}

interface PolygonGeoJson {
  type: "Polygon"
  coordinates: [number, number][][]
}

/**
 * Fetch every room with a polygon, across all floors. Used by the canvas
 * `<RoomPolygonsLayer>` to render saved rooms — the client filters by floor
 * and applies the neighbour-floor fade rule.
 *
 * Polygon geometry is returned via `ST_AsGeoJSON` so the client can parse a
 * standard format instead of a WKT string. The GeoJSON ring closure (where
 * the last coordinate equals the first) is dropped on the way out so the
 * vertices array matches the same shape as createRoom's input.
 */
export const getAllRooms = async (): Promise<PersistedRoom[]> => {
  // ST_AsGeoJSON's default precision is 9 decimal digits, which truncates
  // double-precision coordinates and breaks bit-exact snap behavior on the
  // client (a snapped vertex no longer matches the existing corner once
  // it makes the round trip back to the server). Bumping to 15 digits
  // preserves enough precision for room-scale coordinates to round-trip
  // through JSON without drift.
  const rows = await prisma.$queryRaw<RoomGeoJsonRow[]>`
    SELECT
      id,
      "roomNumber",
      "displayName",
      type,
      floor,
      ST_AsGeoJSON(polygon, 15) AS "polygonJson"
    FROM "Room"
    WHERE polygon IS NOT NULL
    ORDER BY floor, "roomNumber"
  `

  return rows.map((row) => {
    const geo = JSON.parse(row.polygonJson) as PolygonGeoJson
    // GeoJSON polygon: coordinates[0] is the exterior ring, with the
    // first/last coordinate duplicated to close the ring. Drop that
    // duplicate so we match the open shape used elsewhere.
    const ring = geo.coordinates[0]
    const open = ring.slice(0, -1)
    return {
      id: row.id,
      roomNumber: row.roomNumber,
      displayName: row.displayName,
      type: row.type,
      floor: row.floor,
      vertices: open.map(([x, z]) => ({ x, z })),
    }
  })
}

export interface UpdateRoomMetadataInput {
  id: string
  roomNumber: string
  displayName?: string
  type: RoomType
}

/**
 * Update only the metadata of a room. Polygon geometry is left untouched —
 * polygon editing is a separate concern (out of scope for this PBI).
 *
 * Uses the typed Prisma client (no raw SQL) since none of the updated fields
 * are PostGIS-typed.
 */
export const updateRoomMetadata = async (
  input: UpdateRoomMetadataInput,
): Promise<{ id: string }> => {
  await prisma.room.update({
    where: { id: input.id },
    data: {
      roomNumber: input.roomNumber,
      displayName: input.displayName,
      type: input.type,
    },
  })
  return { id: input.id }
}

/**
 * Delete a room by id. Cascades according to the schema:
 * - `Node.roomId` is `onDelete: SetNull`, so navigation nodes that belonged
 *   to this room have their roomId nulled but the nodes themselves survive.
 *   That's the right behavior — corridor nodes that happened to be inside
 *   this room shouldn't disappear with it.
 * - The polygon geometry goes with the row.
 */
export const deleteRoom = async (id: string): Promise<{ id: string }> => {
  await prisma.room.delete({ where: { id } })
  return { id }
}
