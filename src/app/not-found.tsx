import Link from "next/link"
import { FileQuestion } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Polished 404 (SPEC §21). Deliberately identical for every unknown route —
 * it never reveals whether a private note, slug, or admin path exists.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <FileQuestion className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        This page does not exist, or it is private. Notes are only reachable
        through their own link.
      </p>
      <div className="flex items-center gap-2">
        <Button render={<Link href="/new" />}>Start writing</Button>
        <Button variant="outline" render={<Link href="/" />}>
          Home
        </Button>
      </div>
    </div>
  )
}
