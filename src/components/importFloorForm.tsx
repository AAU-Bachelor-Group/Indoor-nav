'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, X, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { uploadImage, getFloorImage } from '#/server/importFloor.functions'

const ACCEPTED_IMAGE_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/svg+xml': ['.svg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
}

export default function ImageUploadWithFloor() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [floor, setFloor] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
  const [failedUpload, setFailedUpload] = useState<string | null>(null)
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0]
    if (!selected) return
    setFile(selected)
    setUploadedPath(null)
    setPreview(URL.createObjectURL(selected))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejections) => {
      const error = rejections[0]?.errors[0]
      if (error?.code === 'file-too-large') {
        setFailedUpload('Image must be 10 MB or smaller')
      } else if (error?.code === 'file-invalid-type') {
        setFailedUpload(
          'Only PNG, JPEG, SVG, WebP, GIF, BMP, and TIFF files are accepted',
        )
      }
    },
  })

  const handleRemove = () => {
    setFile(null)
    setPreview(null)
    setUploadedPath(null)
  }

  const handleFloorChange = async (value: string) => {
    setFloor(value)
    setUploadedPath(null)
    setShowOverwriteWarning(false)
    setExistingImage(null)

    try {
      const result = await getFloorImage({ data: { floor: value } }) // was: floor (stale state)
      setExistingImage(result.filepath)
    } catch {
      setExistingImage(null)
    }
  }

  const doUpload = async () => {
    if (!file || !floor) return
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    try {
      setIsUploading(true)
      setShowOverwriteWarning(false)
      const result = await uploadImage({
        data: { base64, filename: file.name, floor },
      })
      setUploadedPath(result.filepath)
      setExistingImage(result.filepath)
      setFailedUpload(null)
    } catch (err) {
      console.error('Upload failed:', err)
      setFailedUpload('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFailedUpload(null)

    if (!file) {
      setFailedUpload('Please upload an image')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFailedUpload('Image must be 10 MB or smaller')
      return
    }
    if (floor === null) {
      setFailedUpload('Please select a floor')
      return
    }
    if (!Object.keys(ACCEPTED_IMAGE_TYPES).includes(file.type)) {
      setFailedUpload(
        'Only PNG, JPEG, SVG, WebP, GIF, BMP, and TIFF files are accepted',
      )
      return
    }

    setUploadedPath('')
    setFailedUpload('')

    if (!showOverwriteWarning) {
      // Always do a fresh check at submit time, don't trust state
      try {
        const result = await getFloorImage({ data: { floor } })
        if (result.filepath) {
          setExistingImage(result.filepath)
          setShowOverwriteWarning(true)
          return
        }
      } catch {
        // No existing image, safe to proceed
      }
    }

    await doUpload()
  }

  return (
    <>
      {/* Lightbox */}
      {lightboxOpen && existingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute -top-4 -right-4 z-10 rounded-full shadow-lg"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={existingImage}
              alt="Current floor plan"
              className="rounded-xl w-full max-h-[80vh] object-contain shadow-2xl"
            />
            <p className="text-center text-white/70 text-sm mt-3">
              Floor {floor} — current floor plan
            </p>
          </div>
        </div>
      )}

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Drag & Drop */}
            {!preview && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
                ${isDragActive ? 'border-primary bg-muted' : 'border-muted-foreground/30'}`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <UploadCloud className="w-8 h-8" />
                  {isDragActive ? (
                    <p>Drop the image here...</p>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">
                        Drag & drop an image here
                      </p>
                      <p>PNG, JPEG, SVG, WebP, GIF, BMP, TIFF · Max 10 MB</p>
                      <p>or click to browse</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="rounded-xl w-full h-48 object-cover border"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={handleRemove}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Floor Selector */}
            <div className="space-y-2">
              <Label htmlFor="floor">Select Floor</Label>
              <Select onValueChange={handleFloorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a floor" />
                </SelectTrigger>
                <SelectContent>
                  {[-1, 0, 1, 2, 3, 4, 5, 6].map((f) => (
                    <SelectItem key={f} value={f.toString()}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Overwrite Warning */}
            {showOverwriteWarning && existingImage && (
              <div className="rounded-xl border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    A floor plan already exists for floor {floor}. It will be
                    replaced.
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Current image:
                  </p>
                  <div
                    className="relative group cursor-zoom-in"
                    onClick={() => setLightboxOpen(true)}
                  >
                    <img
                      src={existingImage}
                      alt="Existing floor plan"
                      className="rounded-lg w-full h-36 object-cover border border-yellow-300 transition group-hover:brightness-75"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <span className="bg-black/60 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Click to enlarge
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Yes, overwrite'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowOverwriteWarning(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!showOverwriteWarning && (
              <Button type="submit" className="w-full" disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            )}

            {failedUpload && (
              <p className="text-sm text-red-500 font-bold text-center">
                {failedUpload}
              </p>
            )}

            {uploadedPath && (
              <p className="text-sm text-green-500 font-bold text-center">
                {'Floor plan was successfully uploaded for floor ' + floor}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </>
  )
}
