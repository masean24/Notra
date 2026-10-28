import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import Link from "next/link"
import { NotraMark } from "@/components/brand/notra-logo"
import { NoteEditor } from "@/components/editor/note-editor"
import { ReadOnlyContent } from "@/components/notes/read-only-content"
import { ThemeToggle } from "@/components/theme-toggle"
import { EDIT_SESSION_COOKIE_PREFIX } from "@/lib/notes/sessions"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Shared note",
  robots: { index: false },
}

interface RedeemPayload {
  status: "ok" | "expired" | "not_found"
  permission?: "view" | "edit"
  public_id?: string
  title?: string
  content?: unknown
  content_format?: string
  updated_at?: string
  session_expires_at?: string
}

/** Cookie TTL in seconds, computed outside the component (impure clock). */
function sessionMaxAge(sessionExpiresAt: string | undefined): number {
  const expires = sessionExpiresAt ? new Date(sessionExpiresAt).getTime() : 0
  return Math.max(0, Math.floor((expires - Date.now()) / 1000))
}

/**
 * Share-link redemption (SPEC §3/§9): validates the opaque token server-side
 * via `redeem_share` (lookup by SHA-256 hash), then grants the scoped access
 * for its TTL. Invalid, revoked, expired tokens and missing/deleted/expired
 * notes all return the same 404-style page — no information leak.
 */
export default async function ShareRedemptionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const sessionToken = crypto.randomUUID()

  const { data: rpcPayload, error } = await supabase.rpc("redeem_share", {
    p_token: token,
    p_session_token: sessionToken,
  })
  const payload = rpcPayload as RedeemPayload | undefined

  if (error || !payload || payload.status !== "ok") {
    notFound()
  }

  const publicId = payload.public_id as string

  if (payload.permission === "edit") {
    // Mint a real edit-session cookie so PUT /api/notes/[publicId]/save
    // authorizes the redemption edits for the session TTL.
    const maxAge = sessionMaxAge(payload.session_expires_at)
    const cookieStore = await cookies()
    cookieStore.set({
      name: `${EDIT_SESSION_COOKIE_PREFIX}${publicId}`,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    })

    return (
      <NoteEditor
        key={publicId}
        initialContent={payload.content}
        publicId={publicId}
        serverUpdatedAt={payload.updated_at}
      />
    )
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
        <ThemeToggle />
      </header>
      <article className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-balance">
          {payload.title || "Untitled note"}
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          You opened this note with a view-only share link.
        </p>
        <ReadOnlyContent content={payload.content} />
      </article>
    </div>
  )
}
