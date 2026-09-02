"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Copy, ExternalLink, KeyRound, ShieldAlert } from "lucide-react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiRequestError, apiFetch } from "@/lib/client/api"
import { enqueueOp } from "@/lib/sync/drafts"
import {
  generateRandomEditCode,
  isValidCustomEditCode,
} from "@/lib/notes/edit-code"
import { deriveTitleFromContent } from "@/lib/notes/title"

const EXPIRATION_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "custom", label: "Custom" },
] as const

type ExpirationValue = (typeof EXPIRATION_OPTIONS)[number]["value"]

function computeExpiresAt(value: ExpirationValue, custom: string): string | null {
  const now = Date.now()
  switch (value) {
    case "never":
      return null
    case "1h":
      return new Date(now + 60 * 60 * 1000).toISOString()
    case "1d":
      return new Date(now + 24 * 60 * 60 * 1000).toISOString()
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
    case "30d":
      return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
    case "custom":
      return custom ? new Date(custom).toISOString() : null
  }
}

export interface SaveShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: unknown
  /** Preset title suggestion (derived from the document). */
  suggestedTitle: string
  onSaved: (publicId: string, savedTitle: string) => void
  /** Signed-in visitors save to their account — no edit code needed. */
  isAuthenticated?: boolean
}

export function SaveShareDialog({
  open,
  onOpenChange,
  content,
  suggestedTitle,
  onSaved,
  isAuthenticated = false,
}: SaveShareDialogProps) {
  const [title, setTitle] = useState(suggestedTitle)
  const [editingPolicy, setEditingPolicy] =
    useState<"edit_code" | "account" | "read_only">(
      isAuthenticated ? "account" : "edit_code"
    )
  const [codeMode, setCodeMode] = useState<"random" | "custom">("random")
  const [randomCode, setRandomCode] = useState(() => generateRandomEditCode())
  const [customCode, setCustomCode] = useState("")
  const [expiration, setExpiration] = useState<ExpirationValue>("never")
  const [customExpiration, setCustomExpiration] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [result, setResult] = useState<{
    publicId: string
    editCode: string | null
  } | null>(null)

  // The parent remounts this dialog (via key) on every open, so plain
  // initializers above give fresh state — no reset effects needed.

  const effectiveEditCode =
    editingPolicy !== "edit_code"
      ? null
      : codeMode === "random"
        ? randomCode
        : customCode

  const codeValid =
    isAuthenticated ||
    editingPolicy !== "edit_code" ||
    (effectiveEditCode !== null && isValidCustomEditCode(effectiveEditCode))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!codeValid) {
      toast.error(
        editingPolicy === "edit_code" && codeMode === "custom"
          ? "Custom edit code must be 6–64 characters with no whitespace."
          : "Generate an edit code first."
      )
      return
    }
    if (expiration === "custom") {
      const custom = new Date(customExpiration).getTime()
      if (customExpiration === "" || Number.isNaN(custom) || custom <= Date.now()) {
        toast.error("Choose a custom expiration in the future.")
        return
      }
    }

    setSubmitting(true)
    try {
      const effectivePolicy = isAuthenticated ? "account" : editingPolicy
      const data = await apiFetch<{ publicId: string; sessionIssued: boolean }>(
        "/api/notes",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            content,
            contentFormat: "tiptap_json",
            editingPolicy: effectivePolicy,
            editCode:
              !isAuthenticated && editingPolicy === "edit_code"
                ? effectiveEditCode
                : undefined,
            expiresAt: computeExpiresAt(expiration, customExpiration) ?? undefined,
          }),
        }
      )
      setResult({
        publicId: data.publicId,
        editCode:
          !isAuthenticated && editingPolicy === "edit_code"
            ? effectiveEditCode
            : null,
      })
      onSaved(data.publicId, title)
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(error.message)
      } else if (isAuthenticated) {
        // Offline create (SPEC §10): signed-in creates need no edit code, so
        // the note can be created by the sync engine once back online.
        await enqueueOp({
          kind: "create",
          title,
          content,
          contentFormat: "tiptap_json",
          baseUpdatedAt: null,
          requiresAuth: true,
          createdAt: Date.now(),
        })
        toast.info("You appear offline — the note will be created when you reconnect.")
        onOpenChange(false)
      } else {
        // Guest creates need an edit code (shown once, never persisted) —
        // they cannot be queued. The local draft already survives offline.
        toast.error("Could not save the note. You appear to be offline.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const shareUrl = result
    ? `${window.location.origin}/n/${result.publicId}`
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Note saved</DialogTitle>
              <DialogDescription>
                Anyone with this link can view your note.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Input readOnly value={shareUrl} className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copy share link"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl)
                    toast.success("Link copied.")
                  }}
                >
                  <Copy className="size-4" aria-hidden />
                </Button>
              </div>

              {result.editCode ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p className="mb-1 flex items-center gap-1.5 font-medium">
                    <KeyRound className="size-4" aria-hidden />
                    Edit code — shown only once
                  </p>
                  <p className="mb-2 font-mono text-base tracking-wider select-all">
                    {result.editCode}
                  </p>
                  <p className="flex items-start gap-1.5 text-muted-foreground">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    This code cannot be recovered if lost. Store it somewhere
                    safe.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isAuthenticated
                    ? "Saved to your account — only you can edit it. Manage this note from your dashboard."
                    : editingPolicy === "account"
                      ? "Only your account will be able to edit this note after you sign in and claim it."
                      : "This note is permanently read-only."}
                </p>
              )}
            </div>
            <DialogFooter className="mt-2 flex-row justify-between gap-2 sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  render={<Link href={`/n/${result.publicId}`} />}
                >
                  <ExternalLink className="size-4" aria-hidden />
                  Open note
                </Button>
                {isAuthenticated ? (
                  <Button variant="ghost" render={<Link href="/dashboard" />}>
                    Dashboard
                  </Button>
                ) : null}
              </div>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Save &amp; Share</DialogTitle>
              <DialogDescription>
                {isAuthenticated
                  ? "Save this note to your account and get a shareable link."
                  : "Save this note and get a shareable link. No account needed."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="note-title">Title</Label>
                <Input
                  id="note-title"
                  value={title}
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={deriveTitleFromContent(content) || "Untitled note"}
                />
              </div>

              {isAuthenticated ? (
                <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Saved to your account — only you can edit it, from any
                  device, with no edit code. Manage your notes in the
                  dashboard.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>Editing allowed by</Label>
                    <RadioGroup
                      value={editingPolicy}
                      onValueChange={(value) =>
                        setEditingPolicy(value as typeof editingPolicy)
                      }
                      className="gap-2"
                    >
                      <label className="flex items-start gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-ring">
                        <RadioGroupItem value="edit_code" className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium">
                            Anyone with the edit code
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Share the passcode with people who should edit.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-ring">
                        <RadioGroupItem value="account" className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium">
                            Only my account
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Locked until you claim this note while signed in.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-ring">
                        <RadioGroupItem value="read_only" className="mt-0.5" />
                        <span>
                          <span className="block text-sm font-medium">
                            Read-only forever
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Permanently locked. Nobody can edit it again.
                          </span>
                        </span>
                      </label>
                    </RadioGroup>
                  </div>

                  {editingPolicy === "edit_code" ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-code">Edit code</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-code"
                      value={codeMode === "random" ? randomCode : customCode}
                      readOnly={codeMode === "random"}
                      onChange={(event) =>
                        setCustomCode(event.target.value)
                      }
                      className="font-mono tracking-wider"
                      aria-describedby="edit-code-hint"
                    />
                    {codeMode === "random" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRandomCode(generateRandomEditCode())}
                      >
                        Regenerate
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="code-mode"
                        checked={codeMode === "random"}
                        onChange={() => setCodeMode("random")}
                      />
                      Random
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="code-mode"
                        checked={codeMode === "custom"}
                        onChange={() => setCodeMode("custom")}
                      />
                      Custom
                    </label>
                    <span id="edit-code-hint" className="text-xs text-muted-foreground">
                      6–64 characters, no whitespace.
                    </span>
                  </div>
                </div>
              ) : null}
                </>
              )}

              <div className="flex flex-col gap-2">
                <Label>Expires</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={expiration}
                    onValueChange={(value) => setExpiration(value as ExpirationValue)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {expiration === "custom" ? (
                    <Input
                      type="datetime-local"
                      aria-label="Custom expiration date"
                      value={customExpiration}
                      onChange={(event) =>
                        setCustomExpiration(event.target.value)
                      }
                    />
                  ) : null}
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button type="submit" disabled={submitting || !codeValid}>
                  {submitting ? (
                    "Saving…"
                  ) : (
                    <>
                      <Check className="size-4" aria-hidden />
                      Save &amp; Share
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
