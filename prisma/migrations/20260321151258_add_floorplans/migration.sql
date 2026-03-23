-- CreateTable
CREATE TABLE "FloorPlan" (
    "floor" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "calibrationScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorPlan_pkey" PRIMARY KEY ("floor")
);

-- CreateIndex
CREATE UNIQUE INDEX "FloorPlan_floor_key" ON "FloorPlan"("floor");
