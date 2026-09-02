"use client"

import { useEffect, useState } from "react"
import { History, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ReadOnlyContent } from "@/components/notes/read-only-content"
import { ApiRequestError, apiFetch } from "@/lib/client/api"
import { diffWords, type DiffSegment } from "@/lib/notes/diff"

interface RevisionSummary {
  revision_no: number
  title: string
  created_at: string
}

interface RevisionDetail extends RevisionSummary {
  content: unknown
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { timeStyle: "short" })
}

/**
 * Revision history (SPEC §8): grouped by day, view a past snapshot, diff it
 * against the current content, or restore it. Restoring writes a NEW
 * revision server-side and loads the restored content into the editor —
 * history is never rewritten.
 */
export function RevisionsDialog({
  publicId,
  open,
  onOpenChange,
  currentText,
  onRestored,
}: {
  publicId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Plain text of the editor's current content, for the diff view. */
  currentText: string
  onRestored: (content: unknown) => void
}) {
  const [revisions, setRevisions] = useState<RevisionSummary[] | null>(null)
  const [selected, setSelected] = useState<RevisionDetail | null>(null)
  const [diffSegments, setDiffSegments] = useState<DiffSegment[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setSelected(null)
      setDiffSegments(null)
      try {
        const data = await apiFetch<{ revisions: RevisionSummary[] }>(
          `/api/notes/${publicId}/revisions`
        )
        if (!cancelled) {
          setRevisions(data.revisions)
        }
      } catch {
        if (!cancelled) {
          setRevisions([])
          toast.error("Could not load the revision history.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, publicId])

  async function viewRevision(revisionNo: number) {
    setSelected(null)
    setDiffSegments(null)
    setLoading(true)
    try {
      const data = await apiFetch<RevisionDetail>(
        `/api/notes/${publicId}/revisions?revision=${revisionNo}`
      )
      setSelected(data)
    } catch {
      toast.error("Could not load that revision.")
    } finally {
      setLoading(false)
    }
  }

  function showDiff() {
    if (!selected) {
      return
    }
    const oldText = extractDiffText(selected.content)
    setDiffSegments(diffWords(oldText, currentText))
  }

  async function restore() {
    if (!selected) {
      return
    }
    setRestoring(true)
    try {
      await apiFetch(
        `/api/notes/${publicId}/revisions`,
        {
          method: "POST",
          body: JSON.stringify({ revisionNo: selected.revision_no }),
        }
      )
      onRestored(selected.content)
      toast.success(
        `Restored revision ${selected.revision_no}. A new snapshot was added to history.`
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError
          ? error.message
          : "Could not restore the revision."
      )
    } finally {
      setRestoring(false)
    }
  }

  // Group by calendar day.
  const groups = new Map<string, RevisionSummary[]>()
  for (const revision of revisions ?? []) {
    const day = formatDay(revision.created_at)
    const list = groups.get(day) ?? []
    list.push(revision)
    groups.set(day, list)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" aria-hidden />
            Revision history
          </DialogTitle>
          <DialogDescription>
            Every authorized save is snapshotted. Restoring never rewrites
            history — it adds a new revision.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="w-56 shrink-0 overflow-y-auto pr-1">
            {loading && !revisions ? (
              <p className="p-2 text-sm text-muted-foreground">Loading…</p>
            ) : (revisions ?? []).length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                No revisions yet. Save the note to create the first snapshot.
              </p>
            ) : (
              Array.from(groups.entries()).map(([day, items]) => (
                <div key={day} className="mb-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {day}
                  </p>
                  {items.map((revision) => (
                    <button
                      key={revision.revision_no}
                      type="button"
                      onClick={() => viewRevision(revision.revision_no)}
                      className={
                        "block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted " +
                        (selected?.revision_no === revision.revision_no
                          ? "bg-muted"
                          : "")
                      }
                    >
                      <span className="block truncate">
                        {revision.title || "Untitled"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        #{revision.revision_no} · {formatTime(revision.created_at)}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto rounded-lg border p-3">
            {selected ? (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <p className="flex-1 text-sm text-muted-foreground">
                    Revision #{selected.revision_no}
                  </p>
                  <Button variant="outline" size="sm" onClick={showDiff}>
                    Diff vs current
                  </Button>
                  <Button size="sm" disabled={restoring} onClick={restore}>
                    <RotateCcw className="size-3.5" aria-hidden />
                    {restoring ? "Restoring…" : "Restore"}
                  </Button>
                </div>
                {diffSegments ? (
                  <p className="mb-2 flex flex-wrap gap-x-1 text-sm leading-relaxed">
                    {diffSegments.map((segment, index) => (
                      <span
                        key={index}
                        className={
                          segment.type === "removed"
                            ? "rounded bg-destructive/15 text-destructive line-through"
                            : segment.type === "added"
                              ? "rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : undefined
                        }
                      >
                        {segment.text}
                      </span>
                    ))}
                  </p>
                ) : (
                  <ReadOnlyContent content={selected.content} />
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a revision to view, diff, or restore it.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Local copy of the flattening helper — keeps the dialog client-only deps small. */
function extractDiffText(content: unknown): string {
  interface N {
    text?: string
    content?: N[]
  }
  const walk = (node: N): string => {
    if (node.text) {
      return node.text
    }
    return (node.content ?? []).map(walk).join(" ")
  }
  const blocks = ((content as N | null)?.content ?? []) as N[]
  return blocks.map(walk).join("\n").trim()
}
