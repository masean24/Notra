import Link from "next/link"
import {
  ArrowRight,
  AtSign,
  ChevronDown,
  CloudOff,
  Download,
  FileCode2,
  GitBranch,
  KeyRound,
  ListTree,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Server,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

/* Landing page (SPEC §23): bento feature grid, comparison table, tech
   badges, FAQ accordion, self-host teaser — and one honest CTA: /new. */

const techStack = [
  "Next.js 16",
  "TypeScript",
  "Tailwind CSS v4",
  "Supabase",
  "Tiptap",
  "Dexie",
  "Vitest",
]

/** Bento cards: generous rows use col-span-2, compact rows single cells. */
const features = [
  {
    icon: NotebookPen,
    title: "Write instantly",
    body: "The editor opens the moment you arrive. No sign-up wall, no friction — a guest first, always an option later.",
    span: "sm:col-span-2",
  },
  {
    icon: KeyRound,
    title: "Edit codes, not accounts",
    body: "A secret three-part code unlocks editing. Shown exactly once, hashed in the database, never in a URL.",
    span: "",
  },
  {
    icon: CloudOff,
    title: "Works offline",
    body: "Drafts and edits live in IndexedDB and sync automatically when you reconnect — with honest conflict prompts.",
    span: "",
  },
  {
    icon: ListTree,
    title: "Revisions & history",
    body: "Every save snapshots the note. Browse, diff, and restore any past version — restores never lose data.",
    span: "",
  },
  {
    icon: AtSign,
    title: "Vanity slugs & SEO",
    body: "Claim yourname/your-note style paths and tune title, description, and social preview per note.",
    span: "",
  },
  {
    icon: Sparkles,
    title: "AI assistant (BYOK)",
    body: "Continue, rewrite, summarize, or title your notes with your own Gemini API key. It stays yours — the maintainers never pay for or see your usage.",
    span: "sm:col-span-2",
  },
  {
    icon: Server,
    title: "Self-hostable",
    body: "MIT licensed, open source, one Docker command. Point it at hosted Supabase or run the full stack yourself.",
    span: "",
  },
]

/** Comparison table (SPEC §23) — factual, never naming a competitor. */
const comparison: Array<{ aspect: string; ours: string; typical: string }> = [
  { aspect: "Requires an account to write", ours: "No", typical: "Usually" },
  { aspect: "Ads or paywalls", ours: "None, ever", typical: "Common" },
  { aspect: "Tracking / analytics", ours: "None", typical: "Common" },
  { aspect: "Open source", ours: "Yes (MIT)", typical: "Rarely" },
  { aspect: "Self-hostable", ours: "Yes", typical: "Rarely" },
  { aspect: "Offline-first drafts", ours: "Yes", typical: "Rarely" },
  { aspect: "AI with your own key", ours: "Yes (BYOK)", typical: "Bundled & billed" },
]

const faqs = [
  {
    q: "Is it really free?",
    a: "Yes. OpenNotepad is MIT-licensed open source with no ads, no paywalls, and no premium tiers. If you self-host, you pay only your own infrastructure. AI features are bring-your-own-key, so there is no AI bill for the operators either.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can write, save, and share notes as a guest using an edit code. An account is optional — it adds a dashboard, favorites, revisions across devices, and note claiming.",
  },
  {
    q: "What happens if I lose my edit code?",
    a: "The code is shown exactly once and stored only as a hash, so it cannot be recovered. If you claimed the note to an account, you keep owner access; unclaimed notes without the code can no longer be edited.",
  },
  {
    q: "How is my data handled?",
    a: "Notes live in your own (or your self-hosted) Supabase project. This app adds no tracking and no third-party analytics. Share links store only SHA-256 hashes of their tokens, and IPs used for abuse prevention are stored as salted hashes.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes — one docker compose up for the app, plus Supabase from their official hosted or self-hosted stack. The README walks through both paths step by step.",
  },
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
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              render={<Link href="/new" />}
              className="h-11 px-6 text-base"
            >
              Start Writing — Instant &amp; Free
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="#self-host" />}
              className="h-11 px-6 text-base"
            >
              <Download className="size-4" aria-hidden />
              Self-host it
            </Button>
          </div>
        </section>

        {/* Bento feature grid (SPEC §23) */}
        <section
          aria-label="Features"
          className="mx-auto w-full max-w-5xl px-6 pb-20"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`rounded-xl border bg-card p-6 ${feature.span}`}
              >
                <feature.icon
                  className="mb-3 size-5 text-muted-foreground"
                  aria-hidden
                />
                <h2 className="mb-1 font-semibold">{feature.title}</h2>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison table (SPEC §23) */}
        <section
          aria-label="Comparison"
          className="mx-auto w-full max-w-3xl px-6 pb-20"
        >
          <h2 className="mb-6 text-center text-2xl font-bold">
            How it compares
          </h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Aspect
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    OpenNotepad
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-muted-foreground">
                    A typical online notepad
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.aspect} className="border-t">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      {row.aspect}
                    </th>
                    <td className="px-4 py-3 font-medium">{row.ours}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.typical}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Self-host teaser (SPEC §23) */}
        <section
          id="self-host"
          aria-label="Self-hosting"
          className="mx-auto w-full max-w-3xl px-6 pb-20"
        >
          <div className="rounded-xl border bg-card p-8 text-center">
            <Server className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden />
            <h2 className="mb-2 text-2xl font-bold">Own your notes, host your notes</h2>
            <p className="mx-auto mb-4 max-w-xl text-sm text-muted-foreground">
              One command for the app. Supabase runs from their official hosted
              service or their official self-hosted stack — two documented
              paths, no vendored re-implementations.
            </p>
            <pre className="mx-auto mb-4 w-fit max-w-full overflow-x-auto rounded-lg border bg-black/90 px-4 py-3 text-left font-mono text-xs text-green-400">
              <code>git clone &lt;repo&gt; &amp;&amp; cd opennotepad{"\n"}cp .env.example .env.local{"\n"}docker compose up --build</code>
            </pre>
            <Button variant="outline" render={<Link href="#self-host" />}>
              <FileCode2 className="size-4" aria-hidden />
              Full guide in the README
            </Button>
          </div>
        </section>

        {/* FAQ accordion (SPEC §23) — native details/summary: keyboard and
            screen-reader friendly with zero JS and zero motion. */}
        <section
          aria-label="Frequently asked questions"
          className="mx-auto w-full max-w-3xl px-6 pb-20"
        >
          <h2 className="mb-6 text-center text-2xl font-bold">FAQ</h2>
          <div className="flex flex-col gap-2">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border bg-card px-4 py-3"
              >
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {faq.q}
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground motion-safe:transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </span>
                </summary>
                <p className="pt-3 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Tech badges */}
        <section aria-label="Built with" className="mx-auto w-full max-w-4xl px-6 pb-20">
          <ul className="flex flex-wrap items-center justify-center gap-2">
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

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-3xl px-6 pb-24 text-center">
          <h2 className="mb-3 text-2xl font-bold">Ready in one click</h2>
          <p className="mx-auto mb-6 max-w-md text-muted-foreground">
            No account, no setup, no upsell. Open the editor and write.
          </p>
          <Button
            size="lg"
            render={<Link href="/new" />}
            className="h-11 px-6 text-base"
          >
            Start Writing
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-4 text-sm text-muted-foreground">
        <p>MIT licensed. Free, forever.</p>
        <span className="flex items-center gap-1">
          <GitBranch className="size-4" aria-hidden />
          <ShieldCheck className="size-4" aria-hidden />
          Open source · Self-hostable
        </span>
      </footer>
    </div>
  )
}
