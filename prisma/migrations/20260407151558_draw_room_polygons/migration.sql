/*
  Warnings:

  - Added the required column `floor` to the `Node` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `floor` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomNumber` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoomType" ADD VALUE 'CLASSROOM';
ALTER TYPE "RoomType" ADD VALUE 'MEETING_ROOM';
ALTER TYPE "RoomType" ADD VALUE 'OFFICE';
ALTER TYPE "RoomType" ADD VALUE 'STUDY_SPACE';
ALTER TYPE "RoomType" ADD VALUE 'AUDITORIUM';
ALTER TYPE "RoomType" ADD VALUE 'LIBRARY';
ALTER TYPE "RoomType" ADD VALUE 'FOOD_DRINK';
ALTER TYPE "RoomType" ADD VALUE 'FACILITY';

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "floor" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "floor" INTEGER NOT NULL,
ADD COLUMN     "roomNumber" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Node_floor_idx" ON "Node"("floor");

-- CreateIndex
CREATE INDEX "Room_floor_idx" ON "Room"("floor");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_floor_fkey" FOREIGN KEY ("floor") REFERENCES "FloorPlan"("floor") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_floor_fkey" FOREIGN KEY ("floor") REFERENCES "FloorPlan"("floor") ON DELETE CASCADE ON UPDATE CASCADE;

-- Switch PostGIS geometry columns from SRID 4326 (lat/lon) to SRID 0 (local Cartesian meters in the floor frame).
-- Prisma's diff engine ignores Unsupported(...) types, so this block is hand-written.
-- Drop the existing GIST indexes first so the column type change doesn't have to rebuild them mid-flight.
DROP INDEX IF EXISTS "Room_pointZ_gist";
DROP INDEX IF EXISTS "Room_polygon_gist";
DROP INDEX IF EXISTS "Room_multiPolygon_gist";

ALTER TABLE "Room"
  ALTER COLUMN "pointZ"       TYPE geometry(PointZ, 0)       USING ST_SetSRID("pointZ"::geometry, 0),
  ALTER COLUMN "polygon"      TYPE geometry(Polygon, 0)      USING ST_SetSRID("polygon"::geometry, 0),
  ALTER COLUMN "multiPolygon" TYPE geometry(MultiPolygon, 0) USING ST_SetSRID("multiPolygon"::geometry, 0);

CREATE INDEX "Room_pointZ_gist"       ON "Room" USING GIST ("pointZ");
CREATE INDEX "Room_polygon_gist"      ON "Room" USING GIST ("polygon");
CREATE INDEX "Room_multiPolygon_gist" ON "Room" USING GIST ("multiPolygon");
