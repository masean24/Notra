"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LockOpen, NotebookPen } from "lucide-react"
import { EditorContent, useEditor } from "@tiptap/react"
import type { JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NoteEditor } from "@/components/editor/note-editor"
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
        initialContent={note.content}
        publicId={note.public_id}
        onRevoke={revoking ? undefined : handleRevoke}
      />
    )
  }

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
          <ThemeToggle />
          <Button size="sm" onClick={() => setUnlockOpen(true)}>
            <LockOpen className="size-4" aria-hidden />
            Unlock editing
          </Button>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-balance">
          {note.title || "Untitled note"}
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Last updated{" "}
          {new Date(note.updated_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        <ReadOnlyContent content={note.content} />
      </article>

      <UnlockEditDialog
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        publicId={note.public_id}
        onUnlocked={() => router.refresh()}
      />
    </div>
  )
}

function ReadOnlyContent({ content }: { content: unknown }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: (content ?? "") as JSONContent,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap",
        "aria-label": "Note content",
      },
    },
  })

  return <EditorContent editor={editor} />
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
