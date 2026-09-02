"use client"

import { useEffect, useState } from "react"
import { KeyRound, Save, Trash2 } from "lucide-react"
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

/**
 * BYOK Gemini key card (SPEC §12). The key is encrypted server-side
 * (AES-256-GCM with ENCRYPTION_KEY) before storage; the plaintext is never
 * displayed again and never leaves the app except to Google's API per call.
 */
export function GeminiKeyCard() {
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiFetch<{ hasKey: boolean }>("/api/settings/gemini-key")
      .then((data) => setHasKey(data.hasKey))
      .catch(() => setHasKey(false))
  }, [])

  async function saveKey() {
    setBusy(true)
    try {
      await apiFetch("/api/settings/gemini-key", {
        method: "PUT",
        body: JSON.stringify({ apiKey }),
      })
      setApiKey("")
      setHasKey(true)
      toast.success("Gemini key saved — encrypted at rest.")
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "Could not save the key."
      )
    } finally {
      setBusy(false)
    }
  }

  async function removeKey() {
    setBusy(true)
    try {
      await apiFetch("/api/settings/gemini-key", { method: "DELETE" })
      setHasKey(false)
      toast.success("Gemini key removed.")
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "Could not remove the key."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" aria-hidden />
          Gemini API key (BYOK)
        </CardTitle>
        <CardDescription>
          Power the AI assistant with your own Google AI Studio key. It is
          encrypted at rest, used only for your requests, and never shown
          again. The app never pays for or tracks your Gemini usage.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {hasKey ? (
          <p className="text-sm text-muted-foreground">
            A key is saved. Replace it below or remove it.
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="gemini-key">
            {hasKey ? "Replace key" : "API key"}
          </Label>
          <Input
            id="gemini-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Paste your Gemini API key"
            autoComplete="off"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void saveKey()} disabled={busy || apiKey.trim().length < 20}>
            <Save className="size-4" aria-hidden />
            {busy ? "Saving…" : hasKey ? "Replace key" : "Save key"}
          </Button>
          {hasKey ? (
            <Button variant="ghost" disabled={busy} onClick={() => void removeKey()}>
              <Trash2 className="size-4" aria-hidden />
              Remove
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
