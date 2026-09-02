"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * QR code generator (SPEC §6): a scannable QR of the note's share link,
 * rendered locally by the `qrcode` package — no network call, no tracking.
 */
export function QrDialog({
  open,
  onOpenChange,
  url,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!open || !url) {
      return
    }
    let cancelled = false
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((value) => {
        if (!cancelled) {
          setDataUrl(value)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, url])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share via QR code</DialogTitle>
          <DialogDescription>
            Scan to open this note. The QR is generated on your device.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              Could not generate the QR code.
            </p>
          ) : dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={`QR code for ${url}`}
              className="size-64 rounded-lg border"
            />
          ) : (
            <div className="size-64 animate-pulse rounded-lg border bg-muted" />
          )}
          <p className="max-w-full truncate font-mono text-xs text-muted-foreground">
            {url}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
