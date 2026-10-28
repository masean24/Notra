"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HandCoins, NotebookPen } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiRequestError, apiFetch } from "@/lib/client/api"
import { extractPublicId } from "@/lib/notes/public-id"

/**
 * Claim-guest-note tool (Section 5): paste a guest note's link (or public
 * ID) plus its edit code; on success ownership is reassigned and the note
 * appears in the dashboard. The note and its link are never recreated.
 */
export function ClaimNoteForm() {
  const router = useRouter()
  const [noteLink, setNoteLink] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [claimed, setClaimed] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const publicId = extractPublicId(noteLink)
    if (!publicId) {
      setError(
        "Paste the note's share link (like https://…/n/Ab8KxP2) or its 7-character ID."
      )
      return
    }

    setSubmitting(true)
    try {
      const data = await apiFetch<{ claimed: boolean; publicId: string }>(
        `/api/notes/${publicId}/claim`,
        { method: "POST", body: JSON.stringify({ code }) }
      )
      setClaimed(data.publicId)
      setNoteLink("")
      setCode("")
      toast.success("Guest note claimed. It is now in your dashboard.")
      router.refresh()
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message)
      } else {
        setError("Could not claim the note. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HandCoins className="size-4" aria-hidden />
          Claim a guest note
        </CardTitle>
        <CardDescription>
          Bring a note you created without an account into your account using
          its link and edit code. The note keeps its link and history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {claimed ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm">
              Note claimed successfully. It now belongs to your account.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/n/${claimed}`} />}
              >
                <NotebookPen className="size-4" aria-hidden />
                Open note
              </Button>
              <Button size="sm" render={<Link href="/dashboard" />}>
                Go to dashboard
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="claim-link">Note link or ID</Label>
              <Input
                id="claim-link"
                value={noteLink}
                onChange={(event) => setNoteLink(event.target.value)}
                placeholder="https://notra.app/n/Ab8KxP2"
                autoComplete="off"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="claim-code">Edit code</Label>
              <Input
                id="claim-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="max-w-xs font-mono tracking-wider"
                autoComplete="off"
                required
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Claiming…" : "Claim note"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
