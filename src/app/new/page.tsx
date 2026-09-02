import type { Metadata } from "next"

import { NoteEditor } from "@/components/editor/note-editor"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "New note",
}

export default async function NewNotePage() {
  // Signed-in visitors save straight to their account; guests keep the
  // edit-code flow. Writing itself needs no account either way.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <NoteEditor isAuthenticated={Boolean(user)} />
}
