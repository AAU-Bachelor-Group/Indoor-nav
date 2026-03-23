import { useForm } from "@tanstack/react-form"
import { useState, useCallback } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { z } from "zod"

import { uploadImage, getFloorImage } from "#/server/import-floor.functions"

export const ACCEPTED_IMAGE_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
}
export const MAX_FILE_SIZE = 10 * 1024 * 1024

type UploadState = "idle" | "uploading" | "success" | "error"

export const formSchema = z.object({
  file: z
    .instanceof(File, { message: "Please upload an image" })
    .refine((f) => f.size <= MAX_FILE_SIZE, "Image must be 10 MB or smaller")
    .refine(
      (f) => Object.keys(ACCEPTED_IMAGE_TYPES).includes(f.type),
      `Only ${Object.values(ACCEPTED_IMAGE_TYPES).flat().join(", ")} files are accepted`,
    ),
  floor: z.string().min(1, "Please enter a floor"),
})

export const useFloorUpload = () => {
  const [preview, setPreview] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ state: UploadState; message?: string }>({
    state: "idle",
  })
  const [overwrite, setOverwrite] = useState<{ show: boolean; existingImage: string | null }>({
    show: false,
    existingImage: null,
  })

  const doUpload = async (file: File, floor: string) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    try {
      setUploadStatus({ state: "uploading" })
      setOverwrite({ show: false, existingImage: null })
      await uploadImage({ data: { base64, filename: file.name, floor } })
      setUploadStatus({ state: "success" })
    } catch (err) {
      console.error("Upload failed:", err)
      setUploadStatus({ state: "error", message: "Upload failed. Please try again." })
    }
  }

  const form = useForm({
    defaultValues: {
      file: null as File | null,
      floor: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const { file, floor } = value
      if (!file || !floor) return

      setUploadStatus({ state: "idle" })

      if (!overwrite.show) {
        try {
          const result = await getFloorImage({ data: { floor } })
          setOverwrite({ show: true, existingImage: result.filepath })
          return
        } catch (err) {
          const message = err instanceof Error ? err.message : ""
          if (message.includes("Floor image not found") || message.includes("not found")) {
            await doUpload(file, floor)
            return
          }
          setUploadStatus({
            state: "error",
            message: "Failed to check existing floor plan. Please try again.",
          })
          return
        }
      }

      await doUpload(file, floor)
    },
  })

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const { code } = rejectedFiles[0].errors[0] ?? {}
        if (code === "file-too-large") {
          setUploadStatus({ state: "error", message: "Image must be 10 MB or smaller" })
        } else if (code === "file-invalid-type") {
          setUploadStatus({
            state: "error",
            message: `Only ${Object.values(ACCEPTED_IMAGE_TYPES).flat().join(", ")} files are accepted`,
          })
        }
        return
      }

      if (acceptedFiles.length === 0) return

      const selected = acceptedFiles[0]
      form.setFieldValue("file", selected)
      setUploadStatus({ state: "idle" })
      setOverwrite({ show: false, existingImage: null })
      setPreview(URL.createObjectURL(selected))
    },
    [form],
  )

  const dropzone = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  })

  const handleRemove = () => {
    form.setFieldValue("file", null)
    setPreview(null)
    setUploadStatus({ state: "idle" })
    setOverwrite({ show: false, existingImage: null })
  }

  const handleFloorChange = (value: string | null) => {
    if (value === null) return
    if (Number(value) > 20) {
      setUploadStatus({ state: "error", message: "Floor must be 20 or less" })
      return
    }
    if (isNaN(Number(value))) {
      setUploadStatus({ state: "error", message: "Floor must be a number" })
      return
    }
    form.setFieldValue("floor", value)
    setUploadStatus({ state: "idle" })
    setOverwrite({ show: false, existingImage: null })
  }

  return {
    form,
    dropzone,
    preview,
    lightboxOpen,
    setLightboxOpen,
    uploadStatus,
    overwrite,
    setOverwrite,
    handleRemove,
    handleFloorChange,
    doUpload,
    isUploading: uploadStatus.state === "uploading",
  }
}
