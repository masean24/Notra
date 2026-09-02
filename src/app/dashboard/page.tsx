import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { NotebookPen, PenLine, Settings } from "lucide-react"

import { SignOutButton } from "@/components/auth/sign-out-button"
import {
  DashboardToolbar,
  type DashboardSort,
  type DashboardViewMode,
} from "@/components/dashboard/dashboard-toolbar"
import { NoteCard, type DashboardNote } from "@/components/dashboard/note-card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
}

const SORT_COLUMNS: Record<DashboardSort, { column: string; ascending: boolean }> =
  {
    updated: { column: "updated_at", ascending: false },
    created: { column: "created_at", ascending: false },
    title: { column: "title", ascending: true },
  }

const NOTE_COLUMNS =
  "public_id, title, favorite, visibility, editing_policy, expires_at, created_at, updated_at"

function firstParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Flags notes whose expiration has passed. Runs outside the component so the
 * expired badge is computed once per request, not per client render.
 */
function withExpiryFlags(notes: DashboardNote[]): DashboardNote[] {
  const now = Date.now()
  return notes.map((note) => ({
    ...note,
    is_expired:
      note.expires_at !== null && new Date(note.expires_at).getTime() <= now,
  }))
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

  const view: DashboardViewMode =
    firstParam(params.view) === "trash" ? "trash" : "notes"
  const sortParam = firstParam(params.sort)
  const sort: DashboardSort =
    sortParam === "created" || sortParam === "title" ? sortParam : "updated"
  const query = (firstParam(params.q) ?? "").slice(0, 100)
  const favoritesOnly = firstParam(params.fav) === "1" && view === "notes"

  // RLS also scopes every row to the owner; the explicit owner_id filter
  // keeps public notes owned by other users out of the result set.
  const base = supabase
    .from("notes")
    .select(NOTE_COLUMNS)
    .eq("owner_id", user.id)
  let listQuery =
    view === "trash"
      ? base.not("deleted_at", "is", null)
      : base.is("deleted_at", null)
  if (query) {
    // Escape LIKE wildcards so they match literally.
    const escaped = query.replace(/[\\%_]/g, "\\$&")
    listQuery = listQuery.ilike("title", `%${escaped}%`)
  }
  if (favoritesOnly) {
    listQuery = listQuery.eq("favorite", true)
  }
  const sortOrder = SORT_COLUMNS[sort]
  const { data: notes } = await listQuery
    .order(sortOrder.column, { ascending: sortOrder.ascending })
    .limit(200)

  const email = user.email ?? "Signed in"
  const notesList = withExpiryFlags((notes ?? []) as DashboardNote[])

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold"
          aria-label="OpenNotepad home"
        >
          <NotebookPen className="size-4" aria-hidden />
          OpenNotepad
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:inline">
            {email}
          </span>
          <Button variant="ghost" size="sm" render={<Link href="/settings" />}>
            <Settings className="size-4" aria-hidden />
            Settings
          </Button>
          <Button size="sm" render={<Link href="/new" />}>
            <PenLine className="size-4" aria-hidden />
            New note
          </Button>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          {view === "trash" ? "Trash" : "Your notes"}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {view === "trash"
            ? "Notes you deleted stay here until you restore them or delete them forever."
            : "Everything you have saved to your account."}
        </p>

        <DashboardToolbar
          view={view}
          sort={sort}
          favoritesOnly={favoritesOnly}
        />

        {notesList.length === 0 ? (
          <EmptyState view={view} hasQuery={Boolean(query) || favoritesOnly} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notesList.map((note) => (
              <li key={note.public_id} className="flex">
                <NoteCard note={note} view={view} className="flex-1" />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function EmptyState({
  view,
  hasQuery,
}: {
  view: DashboardViewMode
  hasQuery: boolean
}) {
  if (hasQuery) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No notes match your filters.
      </div>
    )
  }
  if (view === "trash") {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        The trash is empty.
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">
        No notes yet. Start writing — no setup needed.
      </p>
      <Button render={<Link href="/new" />}>
        <PenLine className="size-4" aria-hidden />
        Start writing
      </Button>
    </div>
  )
}
