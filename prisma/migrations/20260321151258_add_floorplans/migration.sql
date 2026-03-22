-- CreateTable
CREATE TABLE "FloorPlan" (
    "id" SERIAL NOT NULL,
    "floor" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "aspectRatio" DOUBLE PRECISION NOT NULL,
    "calibrationScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FloorPlan_floor_key" ON "FloorPlan"("floor");
