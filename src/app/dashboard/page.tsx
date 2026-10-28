import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace"
import type { SidebarNote } from "@/components/dashboard/dashboard-sidebar"
import { toPlainText } from "@/lib/notes/serialize"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
}

const NOTE_COLUMNS =
  "public_id, title, favorite, visibility, editing_policy, expires_at, created_at, updated_at, content"

function firstParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

interface RawNoteRecord {
  public_id: string
  title: string | null
  favorite: boolean | null
  visibility: string
  editing_policy: string
  expires_at: string | null
  created_at: string
  updated_at: string
  content: unknown
}

function processNotes(notes: RawNoteRecord[]): SidebarNote[] {
  const now = Date.now()
  return notes.map((note) => {
    const isExpired =
      note.expires_at !== null && new Date(note.expires_at).getTime() <= now
    let snippet = ""
    try {
      if (note.content) {
        snippet = toPlainText(note.content).slice(0, 120).trim()
      }
    } catch {}

    return {
      public_id: note.public_id,
      title: note.title || "",
      favorite: Boolean(note.favorite),
      visibility: note.visibility,
      editing_policy: note.editing_policy,
      expires_at: note.expires_at,
      is_expired: isExpired,
      created_at: note.created_at,
      updated_at: note.updated_at,
      content: note.content,
      snippet,
    }
  })
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?next=/dashboard")
  }

  // Fetch all active notes for the signed-in user
  const { data: notes } = await supabase
    .from("notes")
    .select(NOTE_COLUMNS)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200)

  const notesWithSnippets = processNotes((notes ?? []) as RawNoteRecord[])
  const email = user.email ?? "Signed in"
  const requestedNoteId = firstParam(params.note)

  return (
    <DashboardWorkspace
      initialNotes={notesWithSnippets}
      userEmail={email}
      initialNoteId={requestedNoteId}
    />
  )
}
