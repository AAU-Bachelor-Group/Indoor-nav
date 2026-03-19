import fs from "fs/promises"
import path from "path"

export const saveImageToServer = async (
  base64: string,
  filename: string,
  floor: string,
): Promise<{ filepath: string }> => {
  const uploadDir = path.join(process.cwd(), "public", "uploads")

  // Delete any existing image for this floor
  const existingFiles = await fs.readdir(uploadDir)
  const floorPrefix = `floor_${floor}_`
  for (const file of existingFiles) {
    if (file.startsWith(floorPrefix)) {
      await fs.unlink(path.join(uploadDir, file))
    }
  }

  // Strip the data URL prefix (e.g. "data:image/png;base64,")
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "")
  const buffer = Buffer.from(base64Data, "base64")

  // Build a unique filename: floor_{floor}_{timestamp}_{originalname}
  const nameWithFloor = `${floorPrefix}${filename}`
  const filepath = path.join(uploadDir, nameWithFloor)

  await fs.writeFile(filepath, buffer)

  // Return the public-facing path
  return { filepath: `/uploads/${nameWithFloor}` }
}
