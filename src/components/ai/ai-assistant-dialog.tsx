"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { KeyRound, Sparkles, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiRequestError, apiFetch } from "@/lib/client/api"
import { getSetting, setSetting } from "@/lib/sync/drafts"
import type { AiMode } from "@/lib/ai/prompts"

const MODES: Array<{ value: AiMode; label: string }> = [
  { value: "continue", label: "Continue writing" },
  { value: "rewrite", label: "Rewrite" },
  { value: "summarize", label: "Summarize" },
  { value: "title", label: "Suggest a title" },
]

const GEMINI_KEY_SETTING = "gemini-key"

/**
 * AI assistant dialog (SPEC §12). Bring-your-own-key: guests keep their key
 * in IndexedDB on this device only and it is sent per request; signed-in
 * users use the encrypted key stored in Settings. Without a key the dialog
 * shows an honest enable prompt — never a faked response.
 */
export function AiAssistantDialog({
  open,
  onOpenChange,
  isAuthenticated,
  contextText,
  onInsert,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAuthenticated: boolean
  contextText: string
  onInsert: (text: string) => void
}) {
  const [mode, setMode] = useState<AiMode>("continue")
  const [instruction, setInstruction] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [rememberKey, setRememberKey] = useState(true)
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [hasProfileKey, setHasProfileKey] = useState<boolean | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    const load = async () => {
      setResult(null)
      if (isAuthenticated) {
        try {
          const data = await apiFetch<{ hasKey: boolean }>(
            "/api/settings/gemini-key"
          )
          setHasProfileKey(data.hasKey)
        } catch {
          setHasProfileKey(false)
        }
      } else {
        const stored = await getSetting<string>(GEMINI_KEY_SETTING).catch(
          () => undefined
        )
        if (stored) {
          setApiKey(stored)
          setHasStoredKey(true)
        }
      }
    }
    void load()
  }, [open, isAuthenticated])

  async function run() {
    if (contextText.trim() === "") {
      toast.error("Write something first.")
      return
    }
    const trimmedKey = apiKey.trim()
    if (!isAuthenticated && !hasStoredKey && trimmedKey === "") {
      toast.error("Add your Gemini API key first.")
      return
    }
    setRunning(true)
    setResult(null)
    try {
      if (!isAuthenticated && trimmedKey && rememberKey) {
        await setSetting(GEMINI_KEY_SETTING, trimmedKey)
        setHasStoredKey(true)
      }
      const data = await apiFetch<{ text: string }>("/api/ai/complete", {
        method: "POST",
        body: JSON.stringify({
          mode,
          context: contextText.slice(0, 20_000),
          instruction: instruction || undefined,
          // The key travels in the body for that request only.
          apiKey: isAuthenticated ? undefined : trimmedKey || undefined,
        }),
      })
      setResult(data.text)
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(error.message)
      } else {
        toast.error("Could not reach the AI service. Try again.")
      }
    } finally {
      setRunning(false)
    }
  }

  const hasUsableKey = isAuthenticated
    ? hasProfileKey === true || apiKey.trim() !== ""
    : hasStoredKey || apiKey.trim() !== ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden />
            AI assistant
          </DialogTitle>
          <DialogDescription>
            Bring your own Gemini API key. Requests go through this app&apos;s
            backend, but usage and costs are entirely yours.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="ai-mode">Action</Label>
              <Select
                value={mode}
                onValueChange={(value) => setMode((value ?? "continue") as AiMode)}
              >
                <SelectTrigger id="ai-mode" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mode === "rewrite" ? (
              <div className="flex-1">
                <Label htmlFor="ai-instruction">Instruction</Label>
                <Input
                  id="ai-instruction"
                  value={instruction}
                  maxLength={2000}
                  placeholder="e.g. make it more concise"
                  className="mt-2"
                  onChange={(event) => setInstruction(event.target.value)}
                />
              </div>
            ) : null}
          </div>

          {!isAuthenticated ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ai-key">Gemini API key</Label>
              <Input
                id="ai-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste your Google AI Studio key"
                autoComplete="off"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(event) => setRememberKey(event.target.checked)}
                />
                Remember on this device (stored in IndexedDB, local only —
                never synced)
              </label>
            </div>
          ) : hasProfileKey === false ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="mb-2 flex items-center gap-1.5 font-medium">
                <KeyRound className="size-4" aria-hidden />
                Add your Gemini API key to enable AI writing help
              </p>
              <Button variant="outline" size="sm" render={<Link href="/settings" />}>
                Open Settings
              </Button>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <KeyRound className="size-4" aria-hidden />
              Using your saved Gemini key (manage it in Settings).
            </p>
          )}

          {hasUsableKey ? (
            <div>
              <Button onClick={() => void run()} disabled={running}>
                <Sparkles className="size-4" aria-hidden />
                {running ? "Thinking…" : "Run"}
              </Button>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 whitespace-pre-wrap text-sm">{result}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onInsert(result)
                    onOpenChange(false)
                  }}
                >
                  Insert at cursor
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(result)
                    toast.success("Copied.")
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          ) : null}

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Your key is sent only to process this request and is never logged
            or shared. The app maintainers do not pay for — or see — your
            Gemini usage.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
