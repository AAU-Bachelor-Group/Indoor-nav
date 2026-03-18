
import fs from "fs/promises"
import path from "path"
 
export const saveImageToServer = async (
  base64: string,
  filename: string,
  floor: string
): Promise<{ filepath: string }> => {
  const uploadDir = path.join(process.cwd(), "public", "uploads")
 
  // Ensure the upload directory exists
  await fs.mkdir(uploadDir, { recursive: true })
 
  // Strip the data URL prefix (e.g. "data:image/png;base64,")
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "")
  const buffer = Buffer.from(base64Data, "base64")
 
  // Build a unique filename: floor_{floor}_{timestamp}_{originalname}
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const uniqueName = `floor_${floor}_${Date.now()}_${safeName}`
  const filepath = path.join(uploadDir, uniqueName)
 
  await fs.writeFile(filepath, buffer)
 
  // Return the public-facing path
  return { filepath: `/uploads/${uniqueName}` }
}
 