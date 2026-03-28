import { prisma } from "#/db"

export const getFloorPlans = async () => {
  return await prisma.floorPlan.findMany({
    orderBy: { floor: "asc" },
  })
}

export const getFloorPlansByFloor = async (floor: number) => {
  return await prisma.floorPlan.findUnique({
    where: { floor },
  })
}

export const editFloorPlan = (floor: number, calibrationScale?: number, path?: string) =>
  prisma.floorPlan.update({
    where: { floor },
    data: {
      ...(calibrationScale !== undefined && { calibrationScale }),
      ...(path !== undefined && { path }),
    },
  })
