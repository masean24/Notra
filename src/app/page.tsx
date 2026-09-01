import Link from "next/link"
import { ArrowRight, GitBranch, NotebookPen, ShieldCheck } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

const techStack = [
  "Next.js 16",
  "TypeScript",
  "Tailwind CSS v4",
  "Supabase",
  "Tiptap",
]

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <NotebookPen className="size-5" aria-hidden />
          OpenNotepad
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button variant="outline" render={<Link href="/signup" />}>
            Sign up
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="bg-grid-dots flex flex-col items-center justify-center gap-6 px-6 py-24 text-center md:py-32">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-6xl">
            A distraction-free notepad studio.{" "}
            <span className="text-muted-foreground">Free and open source.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-balance">
            Start writing instantly — no account required. Save and share notes
            with a link when you are ready.
          </p>
          <Button
            size="lg"
            render={<Link href="/new" />}
            className="h-11 px-6 text-base"
          >
            Start Writing — Instant &amp; Free
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </section>

        {/* Feature summary — expanded through later phases */}
        <section className="mx-auto w-full max-w-4xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-6">
              <NotebookPen
                className="mb-3 size-5 text-muted-foreground"
                aria-hidden
              />
              <h2 className="mb-1 font-semibold">Write instantly</h2>
              <p className="text-sm text-muted-foreground">
                A clean editor opens the moment you arrive. No sign-up wall, no
                friction.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <ShieldCheck
                className="mb-3 size-5 text-muted-foreground"
                aria-hidden
              />
              <h2 className="mb-1 font-semibold">
                100% free and open source
              </h2>
              <p className="text-sm text-muted-foreground">
                MIT licensed. No paywalls, no ads, no tracking. Self-host it
                yourself.
              </p>
            </div>
          </div>

          <ul className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {techStack.map((name) => (
              <li
                key={name}
                className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"
              >
                {name}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="flex items-center justify-between border-t px-6 py-4 text-sm text-muted-foreground">
        <p>MIT licensed. Free, forever.</p>
        <span className="flex items-center gap-1">
          <GitBranch className="size-4" aria-hidden />
          Open source
        </span>
      </footer>
    </div>
  )
}
