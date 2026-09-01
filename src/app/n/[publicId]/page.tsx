import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { NoteView } from "@/components/notes/note-viewer"
import { editSessionCookieName, hasEditSession } from "@/lib/notes/sessions"
import { createClient } from "@/lib/supabase/server"

interface PublicNote {
  public_id: string
  title: string
  content: unknown
  content_format: string
  updated_at: string
}

export const metadata: Metadata = {
  robots: { index: false },
}

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const { publicId } = await params
  const supabase = await createClient()

  // RLS guarantees only public, non-expired, non-deleted notes are visible.
  const { data: note } = await supabase
    .from("notes")
    .select(
      "public_id, title, content, content_format, updated_at"
    )
    .eq("public_id", publicId)
    .maybeSingle()

  if (!note) {
    notFound()
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(editSessionCookieName(publicId))?.value
  const editable = await hasEditSession(
    supabase,
    publicId,
    token
  )

  return (
    <NoteView
      note={note as PublicNote}
      editable={editable}
    />
  )
}
