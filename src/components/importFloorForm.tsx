"use client"
import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { uploadImage } from "#/server/importFloor.functions"
 
export default function ImageUploadWithFloor() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [floor, setFloor] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)
 
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0]
    if (!selected) return
    setFile(selected)
    setUploadedPath(null)
    setPreview(URL.createObjectURL(selected))
  }, [])
 
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  })
 
  const handleRemove = () => {
    setFile(null)
    setPreview(null)
    setUploadedPath(null)
  }
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      alert("Please upload an image")
      return
    }
    if (floor === null) {
      alert("Please select a floor")
      return
    }
 
    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
 
    try {
      setIsUploading(true)
      const result = await uploadImage({
        data: { base64, filename: file.name, floor },
      })
      setUploadedPath(result.filepath)
      console.log("Uploaded to:", result.filepath)
    } catch (err) {
      console.error("Upload failed:", err)
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }
 
  return (
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
              ${isDragActive ? "border-primary bg-muted" : "border-muted-foreground/30"}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <UploadCloud className="w-8 h-8" />
                {isDragActive ? (
                  <p>Drop the image here...</p>
                ) : (
                  <>
                    <p className="font-medium text-foreground">Drag & drop an image here</p>
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
            <Select onValueChange={setFloor}>
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
 
          <Button type="submit" className="w-full" disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload Image"}
          </Button>
 
          {/* Success feedback */}
          {uploadedPath && (
            <p className="text-sm text-muted-foreground text-center">
              Saved to:{" "}
              <span className="font-mono text-foreground">{uploadedPath}</span>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}