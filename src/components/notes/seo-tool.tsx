"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ImageIcon, Link2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ApiRequestError, apiFetch } from "@/lib/client/api"

export interface SeoNote {
  publicId: string
  title: string
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  socialImagePath: string | null
  socialImageUrl: string | null
  customSlug: string | null
}

function slugifyCandidate(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
}

/**
 * SEO/sharing metadata tool (SPEC §11): social title/description, canonical
 * URL, social image upload, and the note's vanity slug — with live Open
 * Graph and Twitter Card previews.
 */
export function SeoTool({ note }: { note: SeoNote }) {
  const [metaTitle, setMetaTitle] = useState(note.metaTitle)
  const [metaDescription, setMetaDescription] = useState(note.metaDescription)
  const [canonicalUrl, setCanonicalUrl] = useState(note.canonicalUrl)
  const [imagePath, setImagePath] = useState(note.socialImagePath)
  const [imageUrl, setImageUrl] = useState(note.socialImageUrl)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [slug, setSlug] = useState(note.customSlug ?? slugifyCandidate(note.title))
  const [slugClaimed, setSlugClaimed] = useState<string | null>(note.customSlug)
  const [claiming, setClaiming] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)

  const previewTitle = metaTitle || note.title || "Untitled note"
  const previewDomain =
    typeof window === "undefined" ? "" : window.location.hostname

  async function saveMeta() {
    setSaving(true)
    try {
      await apiFetch(`/api/notes/${note.publicId}/seo`, {
        method: "PATCH",
        body: JSON.stringify({
          metaTitle,
          metaDescription,
          canonicalUrl,
        }),
      })
      toast.success("SEO metadata saved.")
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError
          ? error.message
          : "Could not save the SEO settings."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleImageChange(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (PNG, JPEG, or WebP).")
      return
    }
    if (file.size > 2_000_000) {
      toast.error("Images are limited to 2 MB.")
      return
    }
    setUploading(true)
    try {
      const { getSupabaseBrowserClient, isSupabaseConfigured } = await import(
        "@/lib/supabase/client"
      )
      if (!isSupabaseConfigured()) {
        toast.error("Supabase is not configured in this environment.")
        return
      }
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "png"
      const path = `${note.publicId}-${Date.now()}.${extension}`
      const { error } = await getSupabaseBrowserClient()
        .storage.from("social-images")
        .upload(`social-images/${path}`, file, {
          contentType: file.type,
          upsert: false,
        })
      if (error) {
        throw error
      }
      await apiFetch(`/api/notes/${note.publicId}/seo`, {
        method: "PATCH",
        body: JSON.stringify({ socialImagePath: `social-images/${path}` }),
      })
      setImagePath(`social-images/${path}`)
      setImageUrl(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social-images/${path}`
      )
      toast.success("Social image updated.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload the image."
      )
    } finally {
      setUploading(false)
    }
  }

  async function claimSlug() {
    setSlugError(null)
    setClaiming(true)
    try {
      const data = await apiFetch<{ slug: string }>(
        `/api/notes/${note.publicId}/claim-slug`,
        { method: "POST", body: JSON.stringify({ slug }) }
      )
      setSlugClaimed(data.slug)
      toast.success(`Custom link claimed: /${data.slug}`)
    } catch (error) {
      setSlugError(
        error instanceof ApiRequestError
          ? error.message
          : "Could not claim the slug."
      )
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Social sharing metadata</CardTitle>
          <CardDescription>
            Used by Open Graph and Twitter Card previews when the note link is
            shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="meta-title">Social title</Label>
            <Input
              id="meta-title"
              value={metaTitle}
              maxLength={200}
              placeholder={note.title || "Untitled note"}
              onChange={(event) => setMetaTitle(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="meta-description">Description</Label>
            <Input
              id="meta-description"
              value={metaDescription}
              maxLength={300}
              placeholder="A short summary shown in social previews"
              onChange={(event) => setMetaDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="canonical-url">Canonical URL</Label>
            <Input
              id="canonical-url"
              value={canonicalUrl}
              type="url"
              placeholder="https://example.com/original-article"
              onChange={(event) => setCanonicalUrl(event.target.value)}
            />
          </div>
          <div>
            <Button onClick={saveMeta} disabled={saving}>
              <Save className="size-4" aria-hidden />
              {saving ? "Saving…" : "Save metadata"}
            </Button>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Label htmlFor="social-image">Social image (max 2 MB)</Label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Social preview image"
                  className="size-20 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-lg border border-dashed">
                  <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
                </div>
              )}
              <input
                id="social-image"
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleImageChange(file)
                  }
                  event.target.value = ""
                }}
                disabled={uploading}
              />
            </div>
            {imagePath ? (
              <p className="font-mono text-xs text-muted-foreground">{imagePath}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-4" aria-hidden />
            Custom short link
          </CardTitle>
          <CardDescription>
            Claim a vanity path for this note. Reserved and taken slugs are
            rejected; a claimed slug can be replaced with another claim.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="custom-slug">Slug</Label>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="custom-slug"
                  value={slug}
                  onChange={(event) =>
                    setSlug(event.target.value.toLowerCase().trim())
                  }
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </div>
            <Button onClick={claimSlug} disabled={claiming || slug.length < 3}>
              {claiming ? "Claiming…" : slugClaimed === slug ? "Re-claim" : "Claim"}
            </Button>
          </div>
          {slugError ? (
            <p role="alert" className="text-sm text-destructive">
              {slugError}
            </p>
          ) : null}
          {slugClaimed ? (
            <p className="text-sm text-muted-foreground">
              Current custom link:{" "}
              <span className="font-mono">/{slugClaimed}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live previews</CardTitle>
          <CardDescription>
            Approximate renderings — social networks apply their own styling.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Open Graph
            </p>
            <div className="max-w-lg overflow-hidden rounded-xl border bg-card">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="max-h-48 w-full object-cover"
                />
              ) : null}
              <div className="flex flex-col gap-1 p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  {previewDomain}
                </p>
                <p className="text-sm font-semibold">{previewTitle}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {metaDescription || "Add a description to control this line."}
                </p>
              </div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Twitter / X card
            </p>
            <div className="flex max-w-lg gap-3 rounded-xl border bg-card p-3">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="size-24 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex size-24 shrink-0 items-center justify-center rounded-lg border border-dashed">
                  <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm font-semibold">{previewTitle}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {metaDescription || "Add a description to control this line."}
                </p>
                <p className="text-xs text-muted-foreground">{previewDomain}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
