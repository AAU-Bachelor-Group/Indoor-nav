import { PrismaPg } from "@prisma/adapter-pg"

import { env } from "./env.js"
import { PrismaClient } from "./generated/prisma/client.js"

// Build the PostgreSQL connection string manually
const user = env.POSTGRES_USER || "admin"
const password = env.POSTGRES_PASSWORD || "123456"
const host = env.POSTGRES_HOST || "localhost"
const db = env.POSTGRES_DB || "indoor-nav"
const port = env.POSTGRES_PORT || "5432" // optional, default PostgreSQL port

export const connectionString = `postgresql://${user}:${password}@${host}:${port}/${db}`

const adapter = new PrismaPg({
  connectionString: connectionString,
})

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = globalThis.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma
}
