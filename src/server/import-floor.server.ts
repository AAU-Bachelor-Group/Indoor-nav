import fs from "fs/promises"
import path from "path"

import { prisma } from "#/db"

export const saveImageToServer = async (
  base64: string,
  filename: string,
  floor: string,
): Promise<{ filepath: string }> => {
  const uploadDir =
    process.env.NODE_ENV === "production"
      ? path.join(process.cwd(), ".output", "public", "floorplans")
      : path.join(process.cwd(), "public", "floorplans")

  await fs.mkdir(uploadDir, { recursive: true })

  const existingFiles = await fs.readdir(uploadDir)
  const floorPrefix = `floor_${floor}_`
  for (const file of existingFiles) {
    if (file.startsWith(floorPrefix)) {
      await fs.unlink(path.join(uploadDir, file))
    }
  }

  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "")
  const buffer = Buffer.from(base64Data, "base64")
  const nameWithFloor = `${floorPrefix}${filename}`
  const filepath = path.join(uploadDir, nameWithFloor)
  await fs.writeFile(filepath, buffer)

  const publicPath = `/floorplans/${nameWithFloor}`

  await prisma.floorPlan.upsert({
    where: { floor: parseInt(floor) },
    update: { path: publicPath },
    create: { floor: parseInt(floor), path: publicPath },
  })

  return { filepath: publicPath }
}
