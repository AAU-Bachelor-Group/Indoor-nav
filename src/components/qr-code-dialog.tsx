import { Check, Copy, Download } from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog"
import { Button } from "#/components/ui/button"

interface QRCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** URL to encode. Should be absolute so the QR works after printing. */
  url: string
  title: string
  description?: string
  /** Filename (without extension) used by the Download PNG button. */
  filename?: string
}

const QR_PIXEL_SIZE = 320

/**
 * Modal showing a printable QR code for `url`. Used by the admin "Generate
 * QR" buttons on the room and node edit panels.
 */
export const QRCodeDialog = ({
  open,
  onOpenChange,
  url,
  title,
  description,
  filename = "qr-code",
}: QRCodeDialogProps) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // Reset on close via the derived-state pattern (no effect): when `open`
  // transitions to false, drop the cached image so the next open shows the
  // skeleton loader instead of a stale code.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setDataUrl(null)
      setCopied(false)
    }
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    QRCode.toDataURL(url, {
      width: QR_PIXEL_SIZE,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((u) => {
        if (!cancelled) setDataUrl(u)
      })
      .catch((err: unknown) => {
        console.error("QR code generation failed", err)
      })
    return () => {
      cancelled = true
    }
  }, [open, url])

  const handleDownload = () => {
    if (!dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `${filename}.png`
    a.click()
  }

  const handleCopy = () => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
        }, 1500)
      })
      .catch((err: unknown) => {
        console.error("Clipboard write failed", err)
      })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description && <AlertDialogDescription>{description}</AlertDialogDescription>}

        <div className="flex justify-center">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="QR code"
              width={QR_PIXEL_SIZE}
              height={QR_PIXEL_SIZE}
              className="rounded-md border border-border bg-white"
            />
          ) : (
            <div
              style={{ width: QR_PIXEL_SIZE, height: QR_PIXEL_SIZE }}
              className="animate-pulse rounded-md bg-muted"
            />
          )}
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <span className="grow truncate text-xs text-muted-foreground" title={url}>
            {url}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            aria-label="Copy link"
          >
            {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <Button type="button" onClick={handleDownload} disabled={!dataUrl}>
            <Download className="size-4" />
            Download PNG
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
