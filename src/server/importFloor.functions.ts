
import { createServerFn } from "@tanstack/react-start"
import { saveImageToServer } from "./importFloor.server"
 
export const uploadImage = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { base64: string; filename: string; floor: string } }) => {
    return await saveImageToServer(data.base64, data.filename, data.floor)
  }
)
 