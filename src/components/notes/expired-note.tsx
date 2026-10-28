import Link from "next/link"
import { ClockAlert } from "lucide-react"
import { NotraMark } from "@/components/brand/notra-logo"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * Shown when a public note exists but its expiration has passed (SPEC §9/§21).
 * Expired notes cannot be viewed or edited; data is not hard-deleted here —
 * a separate scheduled cleanup job handles permanent deletion later.
 */
export function ExpiredNote() {
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
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <ClockAlert className="size-12 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-bold tracking-tight">
          This note has expired
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The owner set an expiration for this note, and it has now passed.
          Expired notes cannot be viewed or edited anymore.
        </p>
        <Button variant="outline" render={<Link href="/new" />}>
          Start a new note
        </Button>
      </main>
    </div>
  )
}
