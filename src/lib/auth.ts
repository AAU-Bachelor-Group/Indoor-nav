import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { username } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"

import { prisma } from "#/db"
import { env } from "#/env"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies(), username()],
})

async function seedAdmin() {
  try {
    // Delete and recreate to ensure password always matches env
    await prisma.user.deleteMany({ where: { username: "admin" } })

    await auth.api.signUpEmail({
      body: {
        email: "admin@admin.local",
        password: env.ADMIN_PASSWORD,
        name: "Admin",
        username: "admin",
      },
    })
  } catch (error) {
    console.error("Failed to seed admin user:", error)
  }
}

await seedAdmin()
