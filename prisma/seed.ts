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
  await prisma.node.deleteMany()
  await prisma.edge.deleteMany()
  await prisma.room.deleteMany()
  await prisma.section.deleteMany()

  // Create example floor plans
  const floorPlans = await prisma.floorPlan.createMany({
    data: [
      {
        floor: -1,
        path: "/floorplans/floor_-1_plan.png",
        calibrationScale: 0.05,
      },
      {
        floor: 0,
        path: "/floorplans/floor_0_plan.png",
        calibrationScale: 0.05,
      },
      {
        floor: 1,
        path: "/floorplans/floor_1_plan.png",
        calibrationScale: 0.05,
      },
      {
        floor: 2,
        path: "/floorplans/floor_2_plan.png",
        calibrationScale: 0.05,
      },
      {
        floor: 3,
        path: "/floorplans/floor_3_plan.png",
        calibrationScale: 0.05,
      },
      {
        floor: 4,
        path: "/floorplans/floor_4_plan.png",
        calibrationScale: 0.05,
      },
      {
        floor: 5,
        path: "/floorplans/floor_5_plan.png",
        calibrationScale: 0.05,
      },
      {
        floor: 6,
        path: "/floorplans/floor_6_plan.png",
        calibrationScale: 0.05,
      },
    ],
  })

  console.log(`Created ${floorPlans.count} floor plans`)

  const section = await prisma.section.create({
    data: {
      id: "cmnn25g3f0008xpmt1j9xv22c",
      name: "Main Campus",
    },
  })
  console.log(`Created section: ${section.name}`)

  // Create example nodes (this should be deleted later!!!)
  await prisma.node.createMany({
    data: [
      { x: 0, y: 0, z: 0, type: "DEFAULT", floor: 0 },
      { x: 5, y: 0, z: 0, type: "DEFAULT", floor: 0 },
      { x: 5, y: 5, z: 0, type: "DEFAULT", floor: 0 },
      { x: 0, y: 5, z: 0, type: "DEFAULT", floor: 0 },
    ],
  })

  const nodes = await prisma.node.findMany()

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
