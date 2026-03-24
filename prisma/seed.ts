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

  // Create example nodes (this should be deleted later!!!)
  const nodes = await Promise.all([
    prisma.node.create({
      data: { x: 0, y: 0, z: 0, type: "DEFAULT" },
    }),
    prisma.node.create({
      data: { x: 5, y: 0, z: 0, type: "DEFAULT" },
    }),
    prisma.node.create({
      data: { x: 5, y: 5, z: 0, type: "DEFAULT" },
    }),
    prisma.node.create({
      data: { x: 0, y: 5, z: 0, type: "DEFAULT" },
    }),
  ])

  console.log("Nodes created:", nodes.length)

  // Seed edges (SHOULD BE DELETED LATER!)
  const edges = await prisma.edge.createMany({
    data: [
      // A → B
      {
        fromNodeId: nodes[0].id,
        toNodeId: nodes[1].id,
        distance: 5,
        doors: true,
      },

      // B → C
      {
        fromNodeId: nodes[1].id,
        toNodeId: nodes[2].id,
        distance: 5,
        stairs: true,
      },

      // C → D
      {
        fromNodeId: nodes[2].id,
        toNodeId: nodes[3].id,
        distance: 5,
        elevators: true,
      },

      // D → A
      {
        fromNodeId: nodes[3].id,
        toNodeId: nodes[0].id,
        distance: 5,
        doors: true,
      },
    ],
  })

  console.log("Edges created ", edges.count)
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
