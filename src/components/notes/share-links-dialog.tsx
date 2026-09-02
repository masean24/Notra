"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Link2, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiRequestError, apiFetch } from "@/lib/client/api"

interface ShareRow {
  id: string
  permission: string
  expires_at: string
  revoked_at: string | null
  created_at: string
  /** Computed when the list loads — never during render (purity rule). */
  status: "active" | "expired" | "revoked"
}

const SHARE_EXPIRY_OPTIONS = [
  { value: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { value: "1d", label: "1 day", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
] as const

/**
 * Owner-side share link management (SPEC §9): mints separate opaque tokens
 * with their own permission (view/edit) and TTL, independent of the primary
 * edit code. The minted URL is shown exactly once — only its hash is stored
 * server-side.
 */
export function ShareLinksDialog({
  publicId,
  open,
  onOpenChange,
}: {
  publicId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [shares, setShares] = useState<ShareRow[] | null>(null)
  const [permission, setPermission] = useState<"view" | "edit">("view")
  const [expiry, setExpiry] = useState<string>("7d")
  const [minting, setMinting] = useState(false)
  const [mintedUrl, setMintedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function loadShares() {
    try {
      const data = await apiFetch<{ shares: ShareRow[] }>(
        `/api/notes/${publicId}/share`
      )
      const now = Date.now()
      setShares(
        data.shares.map((share) => ({
          ...share,
          status:
            share.revoked_at !== null
              ? "revoked"
              : new Date(share.expires_at).getTime() <= now
                ? "expired"
                : "active",
        }))
      )
    } catch {
      setShares([])
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }
    const resetAndLoad = async () => {
      setMintedUrl(null)
      await loadShares()
    }
    void resetAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, publicId])

  async function mint() {
    setMinting(true)
    try {
      const option = SHARE_EXPIRY_OPTIONS.find((o) => o.value === expiry)
      const data = await apiFetch<{ url: string }>(
        `/api/notes/${publicId}/share`,
        {
          method: "POST",
          body: JSON.stringify({
            permission,
            expiresAt: new Date(Date.now() + (option?.ms ?? 0)).toISOString(),
          }),
        }
      )
      setMintedUrl(`${window.location.origin}${data.url}`)
      await loadShares()
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError
          ? error.message
          : "Could not create the share link."
      )
    } finally {
      setMinting(false)
    }
  }

  async function revoke(shareId: string) {
    try {
      await apiFetch(`/api/notes/${publicId}/share/revoke`, {
        method: "POST",
        body: JSON.stringify({ shareId }),
      })
      toast.success("Share link revoked.")
      await loadShares()
    } catch {
      toast.error("Could not revoke the share link.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4" aria-hidden />
            Share links
          </DialogTitle>
          <DialogDescription>
            Mint temporary links with their own permission and expiry — no
            edit code needed. Each URL is shown once when minted.
          </DialogDescription>
        </DialogHeader>

        {mintedUrl ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="mb-2 font-medium">Share URL — shown only once</p>
            <div className="mb-2 flex items-center gap-2">
              <input
                readOnly
                value={mintedUrl}
                className="w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
                aria-label="Minted share URL"
              />
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Copy share URL"
                onClick={async () => {
                  await navigator.clipboard.writeText(mintedUrl)
                  setCopied(true)
                  toast.success("Link copied.")
                }}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This URL cannot be retrieved again. Store it somewhere safe.
            </p>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="share-permission">Permission</Label>
            <Select value={permission} onValueChange={(value) => setPermission(value === "edit" ? "edit" : "view")}>
              <SelectTrigger id="share-permission" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Can view</SelectItem>
                <SelectItem value="edit">Can edit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="share-expiry">Expires</Label>
            <Select
              value={expiry}
              onValueChange={(value) => setExpiry(value ?? "7d")}
            >
              <SelectTrigger id="share-expiry" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHARE_EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={mint} disabled={minting}>
            <Plus className="size-4" aria-hidden />
            {minting ? "Creating…" : "Create link"}
          </Button>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-lg border">
          {(shares ?? []).length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              No share links yet.
            </p>
          ) : (
            (shares ?? []).map((share) => {
              return (
                <div
                  key={share.id}
                  className="flex items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0"
                >
                  <span className="w-16 font-medium">
                    {share.permission === "edit" ? "Edit" : "View"}
                  </span>
                  <span className="flex-1 text-xs text-muted-foreground">
                    Expires {new Date(share.expires_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {share.status !== "active" ? (
                    <span className="text-xs text-muted-foreground">
                      {share.status === "revoked" ? "Revoked" : "Expired"}
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => revoke(share.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="size-3.5" aria-hidden />
                      Revoke
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
