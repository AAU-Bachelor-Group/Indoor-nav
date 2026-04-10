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
        path: "/floorplans/floor_-1_ACM15_Kælder-1.png",
        calibrationScale: 1.0,
      },
      {
        floor: 0,
        path: "/floorplans/floor_0_ACM15_Stue-1.png",
        calibrationScale: 1.0,
      },
      {
        floor: 1,
        path: "/floorplans/floor_1_ACM15_1.Sal-1.png",
        calibrationScale: 1.0,
      },
      {
        floor: 2,
        path: "/floorplans/floor_2_ACM15_2.Sal-1.png",
        calibrationScale: 1.0,
      },
      {
        floor: 3,
        path: "/floorplans/floor_3_ACM15_3.Sal-1.png",
        calibrationScale: 1.0,
      },
      {
        floor: 4,
        path: "/floorplans/floor_4_ACM15_4.Sal-1.png",
        calibrationScale: 1.0,
      },
      {
        floor: 5,
        path: "/floorplans/floor_5_ACM15_5.Sal-1.png",
        calibrationScale: 1.0,
      },
      {
        floor: 6,
        path: "/floorplans/floor_6_ACM15_6.Sal-1.png",
        calibrationScale: 1.0,
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

  await prisma.room.createMany({
    data: [
      {
        id: "room-101",
        isActivated: true,
        semanticNames: ["Room 101", "Lecture Hall", "Main Auditorium"],
        type: "DEFAULT",
        sectionId: section.id,
      },
      {
        id: "room-102",
        isActivated: true,
        semanticNames: ["Room 102", "Computer Lab", "IT Lab"],
        type: "DEFAULT",
        sectionId: section.id,
      },
    ],
  })

  console.log("Created 2 rooms: room-101, room-102")

  // Create example nodes (this should be deleted later!!!)
  await prisma.node.createMany({
    data: [
      { x: 0, y: 0, z: 0, type: "DEFAULT" },
      { x: 5, y: 0, z: 0, type: "DEFAULT" },
      { x: 5, y: 5, z: 0, type: "DEFAULT" },
      { x: 0, y: 5, z: 0, type: "DEFAULT" },
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
