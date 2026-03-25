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
    // Delete and recreate to ensure password always matches env.
    // Use direct Prisma insert instead of signUpEmail to avoid creating a session.
    const ctx = await auth.$context
    const hashedPassword = await ctx.password.hash(env.ADMIN_PASSWORD)
    const userId = crypto.randomUUID()

    await prisma.user.deleteMany({ where: { username: "admin" } })
    await prisma.user.create({
      data: {
        id: userId,
        email: "admin@admin.local",
        name: "Admin",
        username: "admin",
        emailVerified: true,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: userId,
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
    })
    console.log("Admin user seeded successfully")
  } catch (error) {
    console.error("Failed to seed admin user:", error)
  }
}

await seedAdmin()
