import { createServerFn } from "@tanstack/react-start"
import { saveImageToServer } from "./importFloor.server"
import fs from "fs/promises"
import path from "path"

export const uploadImage = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { base64: string; filename: string; floor: string } }) => {
    return await saveImageToServer(data.base64, data.filename, data.floor)
  }
)

export const getFloorImage = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: { floor: string } }) => {
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    try {
      const files = await fs.readdir(uploadDir)
      const existing = files.find((f) => f.startsWith(`floor_${data.floor}_`))
      return { filepath: existing ? `/uploads/${existing}` : null }
    } catch {
      return { filepath: null }
    }
  }
)