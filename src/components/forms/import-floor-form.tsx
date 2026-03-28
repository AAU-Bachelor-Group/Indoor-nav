import { UploadCloud, X } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useFloorUpload, ACCEPTED_IMAGE_TYPES } from "./use-floor-form"

const ImportFloorForm = () => {
  const {
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
    isUploading,
  } = useFloorUpload()

  const { getRootProps, getInputProps, isDragActive } = dropzone

  return (
    <>
      {lightboxOpen && overwrite.existingImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => {
            setLightboxOpen(false)
          }}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute -top-4 -right-4 z-10 rounded-full shadow-lg"
              onClick={() => {
                setLightboxOpen(false)
              }}
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={overwrite.existingImage}
              alt="Current floor plan"
              className="rounded-xl w-full max-h-[80vh] object-contain shadow-2xl"
            />
            <p className="text-center text-white/70 text-sm mt-3">
              Floor {form.getFieldValue("floor")} — current floor plan
            </p>
          </div>
        </div>
      )}

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit().catch((err: unknown) => {
                console.error("Form submission error:", err)
              })
            }}
            className="space-y-4"
          >
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl text-center cursor-pointer transition
                ${preview ? "p-3" : "p-6"}
                ${isDragActive ? "border-primary bg-muted" : "border-muted-foreground/30"}`}
            >
              <input {...getInputProps()} />
              <div
                className={`flex items-center gap-2 text-sm text-muted-foreground ${preview ? "justify-center flex-row" : "flex-col"}`}
              >
                <UploadCloud className={preview ? "w-4 h-4 shrink-0" : "w-8 h-8"} />
                {isDragActive ? (
                  <p>Drop the image here...</p>
                ) : preview ? (
                  <p className="text-xs">Drop a new image to replace, or click to browse</p>
                ) : (
                  <>
                    <p className="font-medium text-foreground">Drag & drop an image here</p>
                    <p>{Object.values(ACCEPTED_IMAGE_TYPES).flat().join(", ")} · Max 10 MB</p>
                    <p>or click to browse</p>
                  </>
                )}
              </div>
            </div>

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

            <form.Field name="floor">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    placeholder="Enter floor number"
                    aria-invalid={field.state.meta.errors.length > 0}
                    value={field.state.value}
                    onChange={(e) => {
                      handleFloorChange(e.target.value)
                    }}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-500">
                      {typeof field.state.meta.errors[0] === "string"
                        ? field.state.meta.errors[0]
                        : field.state.meta.errors[0]?.message}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <AlertDialog
              open={overwrite.show && !!overwrite.existingImage}
              onOpenChange={(open) => {
                if (!open) setOverwrite({ show: false, existingImage: null })
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Overwrite existing floor plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A floor plan already exists for floor {form.getFieldValue("floor")}. This will
                    replace it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {overwrite.existingImage && (
                  <div
                    className="relative group cursor-zoom-in"
                    onClick={() => {
                      setLightboxOpen(true)
                    }}
                  >
                    <img
                      src={overwrite.existingImage}
                      alt="Existing floor plan"
                      className="rounded-lg w-full h-48 object-cover border transition group-hover:brightness-75"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <span className="bg-black/60 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Click to enlarge
                      </span>
                    </div>
                  </div>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      setOverwrite({ show: false, existingImage: null })
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isUploading}
                    onClick={() => {
                      void (async () => {
                        const file = form.getFieldValue("file")
                        const floor = form.getFieldValue("floor")
                        if (file && floor) await doUpload(file, floor)
                      })()
                    }}
                  >
                    {isUploading ? "Uploading..." : "Yes, overwrite"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {!overwrite.show && (
              <Button type="submit" className="w-full" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload Image"}
              </Button>
            )}

            <form.Subscribe selector={(state) => state.errors}>
              {(errors) =>
                errors.length > 0 && (
                  <p className="text-sm text-red-500 font-bold text-center">
                    {Object.values(errors[0] ?? {})[0]?.[0]?.message}
                  </p>
                )
              }
            </form.Subscribe>

            {uploadStatus.state === "error" && (
              <p className="text-sm text-red-500 font-bold text-center">{uploadStatus.message}</p>
            )}
            {uploadStatus.state === "success" && (
              <p className="text-sm text-green-500 font-bold text-center">
                {`Floor plan was successfully uploaded for floor ${form.getFieldValue("floor")}`}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </>
  )
}

export default ImportFloorForm
