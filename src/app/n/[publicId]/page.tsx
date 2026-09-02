import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { NoteEditor } from "@/components/editor/note-editor"
import { NoteView } from "@/components/notes/note-viewer"
import { editSessionCookieName, hasEditSession } from "@/lib/notes/sessions"
import { createClient } from "@/lib/supabase/server"

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

  // RLS: everyone can see public, non-expired, non-deleted notes; owners
  // additionally see their own private/expired notes here.
  const { data: note } = await supabase
    .from("notes")
    .select(
      "public_id, owner_id, title, content, content_format, updated_at, deleted_at"
    )
    .eq("public_id", publicId)
    .maybeSingle()

  if (!note) {
    notFound()
  }

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = Boolean(user && note.owner_id && note.owner_id === user.id)

  // Owners edit their own notes directly — no edit code, no unlock flow.
  // (A trashed note only resolves for its owner; treat it as gone.)
  if (isOwner) {
    if (note.deleted_at) {
      notFound()
    }
    return (
      <NoteEditor
        key={note.public_id}
        initialContent={note.content}
        publicId={note.public_id}
        isAuthenticated
      />
    )
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
      note={{
        public_id: note.public_id,
        title: note.title,
        content: note.content,
        content_format: note.content_format,
        updated_at: note.updated_at,
      }}
      editable={editable}
    />
  )
}
