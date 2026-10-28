import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Share2 } from "lucide-react"
import { NotraMark } from "@/components/brand/notra-logo"

import { SeoTool, type SeoNote } from "@/components/notes/seo-tool"
import { createClient } from "@/lib/supabase/server"
import { socialImageUrl } from "@/lib/notes/images"

export const metadata: Metadata = {
  title: "SEO & sharing",
  robots: { index: false },
}

export default async function NoteSeoPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const { publicId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?next=/notes/${publicId}/seo`)
  }

  // Owner-only: RLS returns nothing for notes the caller does not own.
  const { data: note } = await supabase
    .from("notes")
    .select(
      "public_id, title, custom_slug, meta_title, meta_description, canonical_url, social_image_path"
    )
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle()
  if (!note) {
    notFound()
  }

  const seoNote: SeoNote = {
    publicId: note.public_id,
    title: note.title,
    metaTitle: note.meta_title ?? "",
    metaDescription: note.meta_description ?? "",
    canonicalUrl: note.canonical_url ?? "",
    socialImagePath: note.social_image_path,
    socialImageUrl: socialImageUrl(note.social_image_path),
    customSlug: note.custom_slug,
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold"
          aria-label="Notra home"
        >
          <NotraMark className="size-4" />
          Notra
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Share2 className="size-5" aria-hidden />
          SEO &amp; sharing
        </h1>
        <p className="mb-6 truncate text-sm text-muted-foreground">
          {seoNote.title || "Untitled note"} · /n/{seoNote.publicId}
        </p>
        <SeoTool note={seoNote} />
      </main>
    </div>
  )
}
