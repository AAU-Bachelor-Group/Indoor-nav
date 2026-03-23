import { PrismaClient } from "../src/generated/prisma/client.js"
import { connectionString } from "#/db.js"

import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({
  connectionString,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // Clear existing data
  await prisma.floorPlan.deleteMany()

  // Create example floor plans
  const floorPlans = await prisma.floorPlan.createMany({
    data: [
      {
        floor: 0,
        path: "/floorplans/ACM15_1.Sal_page-0001.jpg",
        calibrationScale: 1.0,
      },
      {
        floor: 1,
        path: "/floorplans/ACM15_2.Sal_page-0001.jpg",
        calibrationScale: 1.0,
      },
    ],
  })

  console.log(`Created ${floorPlans.count} floor plans`)
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
