import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ExpiredNote } from "@/components/notes/expired-note"
import { NoteView } from "@/components/notes/note-viewer"
import { socialImageUrl } from "@/lib/notes/images"
import { createClient } from "@/lib/supabase/server"

interface SlugPayload {
  status: "ok" | "expired" | "not_found"
  public_id?: string
  title?: string
  content?: unknown
  content_format?: string
  meta_title?: string | null
  meta_description?: string | null
  canonical_url?: string | null
  social_image_path?: string | null
  updated_at?: string
}

async function loadNote(slug: string): Promise<SlugPayload | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_note_by_slug", {
    p_slug: slug,
  })
  if (error || !data) {
    return null
  }
  return data as SlugPayload
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const payload = await loadNote(slug)
  if (!payload || payload.status !== "ok") {
    return { title: "Not found" }
  }
  const image = socialImageUrl(payload.social_image_path ?? null)
  return {
    title: payload.meta_title || payload.title || "Untitled note",
    description: payload.meta_description ?? undefined,
    alternates: payload.canonical_url
      ? { canonical: payload.canonical_url }
      : undefined,
    openGraph: {
      title: payload.meta_title || payload.title || "Untitled note",
      description: payload.meta_description ?? undefined,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: payload.meta_title || payload.title || "Untitled note",
      description: payload.meta_description ?? undefined,
      images: image ? [image] : undefined,
    },
  }
}

/**
 * Vanity short link (SPEC §3): resolves a claimed custom_slug to a public
 * note. Unclaimed, reserved, malformed, private, and expired slugs render
 * the generic 404 page — a probe learns nothing about which slugs exist.
 */
export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const payload = await loadNote(slug)
  if (!payload || payload.status === "not_found") {
    notFound()
  }
  if (payload.status === "expired") {
    return <ExpiredNote />
  }

  return (
    <NoteView
      note={{
        public_id: payload.public_id ?? "",
        title: payload.title ?? "",
        content: payload.content,
        content_format: payload.content_format ?? "tiptap_json",
        updated_at: payload.updated_at ?? new Date().toISOString(),
      }}
      editable={false}
    />
  )
}
