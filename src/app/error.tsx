"use client"

import { useEffect } from "react"
import { RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Generic error boundary page (SPEC §21). Logs to the console only — never
 * to any third party — and offers a retry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        An unexpected error occurred. Your local drafts are safe — try again,
        and if it keeps happening, come back in a moment.
      </p>
      <Button onClick={reset}>
        <RefreshCcw className="size-4" aria-hidden />
        Try again
      </Button>
    </div>
  )
}
