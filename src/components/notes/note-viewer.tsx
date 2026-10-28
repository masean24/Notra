"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Calendar, LockOpen, Plus } from "lucide-react"
import { toast } from "sonner"

import { NotraMark } from "@/components/brand/notra-logo"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NoteEditor } from "@/components/editor/note-editor"
import { ReadOnlyContent } from "@/components/notes/read-only-content"
import { ThemeToggle } from "@/components/theme-toggle"
import { ApiRequestError, apiFetch } from "@/lib/client/api"

export interface NoteViewProps {
  note: {
    public_id: string
    title: string
    content: unknown
    content_format: string
    updated_at: string
  }
  editable: boolean
}

export function NoteView({ note, editable }: NoteViewProps) {
  const router = useRouter()
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)

  async function handleRevoke() {
    setRevoking(true)
    try {
      await apiFetch(`/api/notes/${note.public_id}/revoke-edit`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      toast.success("Editing locked. The note is read-only again.")
      router.refresh()
    } catch {
      toast.error("Could not lock the note. Please try again.")
    } finally {
      setRevoking(false)
    }
  }

  if (editable) {
    return (
      <NoteEditor
        key={note.public_id}
        initialTitle={note.title}
        initialContent={note.content}
        publicId={note.public_id}
        onRevoke={revoking ? undefined : handleRevoke}
        serverUpdatedAt={note.updated_at}
      />
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 sm:px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold group"
            aria-label="Notra home"
          >
            <NotraMark className="size-6 transition-transform group-hover:scale-105" />
            <span className="font-bold tracking-tight">Notra</span>
          </Link>
          <span className="text-muted-foreground/35 font-mono text-xs">/</span>
          <span className="rounded-full bg-brand/10 border border-brand/25 px-2.5 py-0.5 text-[11px] font-medium text-brand-ink">
            Shared Note
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="size-8 rounded-lg border border-border/80 bg-card/70 text-muted-foreground hover:text-foreground" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUnlockOpen(true)}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <LockOpen className="size-3.5" aria-hidden />
            <span>Unlock editing</span>
          </Button>
          <Button
            size="sm"
            render={<Link href="/new" />}
            className="h-8 gap-1.5 rounded-lg text-xs hidden sm:inline-flex"
          >
            <Plus className="size-3.5" aria-hidden />
            <span>New Note</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
        <article className="w-full max-w-3xl rounded-2xl border border-border/80 bg-card px-6 sm:px-14 py-10 sm:py-14 shadow-lg">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Last updated{" "}
              {new Date(note.updated_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px]">
              Read-only view
            </span>
          </div>

          <h1 className="mb-6 text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
            {note.title || "Untitled note"}
          </h1>

          <div className="border-t border-border/50 pt-6">
            <ReadOnlyContent content={note.content} />
          </div>
        </article>
      </main>

      <UnlockEditDialog
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        publicId={note.public_id}
        onUnlocked={() => router.refresh()}
      />
    </div>
  )
}

function UnlockEditDialog({
  open,
  onOpenChange,
  publicId,
  onUnlocked,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  publicId: string
  onUnlocked: () => void
}) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await apiFetch(`/api/notes/${publicId}/verify-edit`, {
        method: "POST",
        body: JSON.stringify({ code }),
      })
      onUnlocked()
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message)
      } else {
        setError("Could not verify the code. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCode("")
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Unlock editing</DialogTitle>
          <DialogDescription>
            Enter this note&apos;s edit code to edit for 30 minutes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="unlock-code">Edit code</Label>
            <Input
              id="unlock-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="font-mono tracking-wider"
              autoComplete="off"
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Verifying…" : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
