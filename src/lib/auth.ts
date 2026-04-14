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
    const ctx = await auth.$context
    const hashedPassword = await ctx.password.hash(env.ADMIN_PASSWORD)

    // Upsert the admin user instead of delete+create. Reusing the existing
    // User row (and its id) is critical: Session.userId has onDelete: Cascade,
    // so deleting the user wipes every active session and logs everyone out
    // on every module reload (HMR, dev server restart, etc.).
    const user = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        id: crypto.randomUUID(),
        email: "admin@admin.local",
        name: "Admin",
        username: "admin",
        emailVerified: true,
      },
    })

    // Keep the credential account's password in sync with env. This is
    // idempotent and does not touch the Session table.
    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    })
    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      })
    } else {
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: hashedPassword,
        },
      })
    }
  } catch (error) {
    console.error("Failed to seed admin user:", error)
  }
}

await seedAdmin()
