"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  EyeOff,
  Lock,
  LockOpen,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiRequestError, apiFetch } from "@/lib/client/api"

export interface DashboardNote {
  public_id: string
  title: string
  favorite: boolean
  visibility: string
  editing_policy: string
  expires_at: string | null
  /** Computed server-side so the client never calls Date.now() during render. */
  is_expired: boolean
  created_at: string
  updated_at: string
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

/**
 * A single dashboard note. In the notes view it offers favorite toggle and
 * move-to-trash; in the trash view restore and permanent delete.
 */
export function NoteCard({
  note,
  view,
  className,
}: {
  note: DashboardNote
  view: "notes" | "trash"
  className?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false)
  const [favorite, setFavorite] = useState(note.favorite)

  const isExpired = note.is_expired

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  function toggleFavorite() {
    const next = !favorite
    setFavorite(next)
    run(async () => {
      try {
        await apiFetch(`/api/notes/${note.public_id}`, {
          method: "PATCH",
          body: JSON.stringify({ favorite: next }),
        })
        router.refresh()
      } catch (error) {
        setFavorite(!next)
        toast.error(
          error instanceof ApiRequestError
            ? error.message
            : "Could not update the note. Please try again."
        )
      }
    })
  }

  function moveToTrash() {
    run(async () => {
      try {
        await apiFetch(`/api/notes/${note.public_id}`, { method: "DELETE" })
        toast.success("Moved to trash. Restore it any time.")
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof ApiRequestError
            ? error.message
            : "Could not move the note to trash. Please try again."
        )
      }
    })
  }

  function restore() {
    run(async () => {
      try {
        await apiFetch(`/api/notes/${note.public_id}/restore`, {
          method: "POST",
          body: JSON.stringify({}),
        })
        toast.success("Note restored.")
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof ApiRequestError
            ? error.message
            : "Could not restore the note. Please try again."
        )
      }
    })
  }

  function purge() {
    setConfirmPurgeOpen(false)
    run(async () => {
      try {
        await apiFetch(`/api/notes/${note.public_id}?permanent=true`, {
          method: "DELETE",
        })
        toast.success("Note permanently deleted.")
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof ApiRequestError
            ? error.message
            : "Could not delete the note. Please try again."
        )
      }
    })
  }

  return (
    <article
      className={
        "group relative flex flex-col gap-2 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md" +
        (className ? ` ${className}` : "")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-balance">
          {view === "trash" ? (
            <span className="text-muted-foreground" aria-disabled>
              {note.title || "Untitled note"}
            </span>
          ) : (
            <Link
              href={`/n/${note.public_id}`}
              className="underline-offset-4 hover:underline"
            >
              {note.title || "Untitled note"}
            </Link>
          )}
        </h3>
        {view === "notes" ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              favorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={favorite}
            disabled={busy}
            onClick={toggleFavorite}
            className={
              favorite ? "text-amber-500 hover:text-amber-500" : undefined
            }
          >
            <Star
              className="size-4"
              aria-hidden
              fill={favorite ? "currentColor" : "none"}
            />
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Updated {formatDate(note.updated_at)}
        {isExpired ? " · expired" : ""}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {note.visibility === "private" ? (
          <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs">
            <EyeOff className="size-3" aria-hidden />
            Private
          </span>
        ) : null}
        {note.editing_policy === "edit_code" ? (
          <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs">
            <LockOpen className="size-3" aria-hidden />
            Edit code
          </span>
        ) : note.editing_policy === "read_only" ? (
          <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs">
            <Lock className="size-3" aria-hidden />
            Read-only
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {view === "notes" ? (
          <>
            <Button variant="outline" size="sm" render={<Link href={`/n/${note.public_id}`} />}>
              Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={moveToTrash}
              className="ml-auto text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Trash
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" disabled={busy} onClick={restore}>
              <RotateCcw className="size-3.5" aria-hidden />
              Restore
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmPurgeOpen(true)}
              className="ml-auto text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete forever
            </Button>
          </>
        )}
      </div>

      <Dialog
        open={confirmPurgeOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmPurgeOpen(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this note forever?</DialogTitle>
            <DialogDescription>
              &ldquo;{note.title || "Untitled note"}&rdquo; and its revision
              history will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPurgeOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={purge}>
              {busy ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
