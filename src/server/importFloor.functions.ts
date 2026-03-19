import fs from "fs/promises"
import path from "path"
import { createServerFn } from "@tanstack/react-start"
import { saveImageToServer } from "./importFloor.server"

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator((data: { base64: string; filename: string; floor: string }) => data)
  .handler(async ({ data }) => {
    await saveImageToServer(data.base64, data.filename, data.floor)
  })

export const getFloorImage = createServerFn({ method: "POST" })
  .inputValidator((data: { floor: string }) => data)
  .handler(async ({ data }) => {
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    try {
      const files = await fs.readdir(uploadDir)
      const existing = files.find((f) => f.startsWith(`floor_${data.floor}_`))
      return { filepath: existing ? `/uploads/${existing}` : null }
    } catch {
      return { filepath: null }
    }
  })