import fs from "fs/promises"
import path from "path"

import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { saveImageToServer } from "./import-floor.server"

const uploadImageSchema = z.object({
  base64: z.string().min(1),
  filename: z.string().min(1),
  floor: z.string().min(1).max(20),
})

const getFloorImageSchema = z.object({
  floor: z.string().min(1),
})

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator(uploadImageSchema)
  .handler(async ({ data }) => {
    await saveImageToServer(data.base64, data.filename, data.floor)
  })

export const getFloorImage = createServerFn({ method: "GET" })
  .inputValidator(getFloorImageSchema)
  .handler(async ({ data }) => {
    const uploadDir =
      process.env.NODE_ENV === "production"
        ? path.join(process.cwd(), ".output", "public", "floorplans")
        : path.join(process.cwd(), "public", "floorplans")

    let files: string[]
    try {
      files = await fs.readdir(uploadDir)
    } catch {
      throw new Error("Upload directory not found")
    }

    const existing = files.find((f) => f.startsWith(`floor_${data.floor}_`))
    if (!existing) {
      throw new Error(`Floor image not found for floor: ${data.floor}`)
    }

    return { filepath: `/floorplans/${existing}` }
  })
