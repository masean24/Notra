"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Globe,
  Lock,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Terminal,
} from "lucide-react"

import { NotraMark } from "@/components/brand/notra-logo"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/client/api"

/**
 * The /admin decoy (SPEC §14/§27 Phase 9): a harmless multilingual "nice
 * try" joke. It contains no admin functionality and reveals nothing — it
 * looks the same for every visitor. The punchline re-rolls on click and the
 * fake terminal animates unless the visitor prefers reduced motion.
 */

const PUNCHLINES: Array<{ lang: string; code: string; line: string }> = [
  { lang: "English", code: "EN", line: "Nice try. This is a decoy." },
  { lang: "Bahasa Indonesia", code: "ID", line: "Nice try. Ini cuma umpan." },
  { lang: "Basa Jawa", code: "JV", line: "Cobi maneh… kiye mung umpan, le." },
  { lang: "日本語", code: "JA", line: "いい挑戦です。ここはただのおとりです。" },
  { lang: "Français", code: "FR", line: "Bien joué… mais c'est un appât." },
  { lang: "Español", code: "ES", line: "Buen intento. Esto es solo un señuelo." },
  { lang: "Deutsch", code: "DE", line: "Guter Versuch. Das ist nur ein Köder." },
  { lang: "Basa Sunda", code: "SU", line: "Nyobian deui? Ieu ngan sa umpan." },
  { lang: "Português", code: "PT", line: "Boa tentativa. Isto é apenas uma isca." },
  { lang: "Italiano", code: "IT", line: "Bel tentativo. Questo è solo un'esca." },
  { lang: "한국어", code: "KO", line: "좋은 시도네요. 여긴 그저 미끼일 뿐입니다." },
  { lang: "Türkçe", code: "TR", line: "İyi deneme. Burası sadece bir yem." },
]

const TERMINAL_SCRIPT = [
  "$ notra admin --login",
  "> resolving /admin …",
  "> checking privileges …",
  "> privileges: none",
  "> route purpose: entertainment",
  "ACCESS DENIED — have a great day",
]

const TYPE_STEP_MS = 650

/** Picks a different punchline than the current one. */
function nextPunchline(current: number): number {
  let next = current
  while (next === current) {
    next = Math.floor(Math.random() * PUNCHLINES.length)
  }
  return next
}

export function AdminDecoy() {
  const [punchline, setPunchline] = useState(0)
  const [typedLines, setTypedLines] = useState<string[]>([])
  const [reducedMotion, setReducedMotion] = useState(true)
  const [attempts, setAttempts] = useState(1)
  const reported = useRef(false)

  // Detect reduced motion after mount (SSR-safe).
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = async () => {
      await Promise.resolve()
      setReducedMotion(media.matches)
    }
    void apply()
    function onChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches)
    }
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  // One randomized punchline + probe report per decoy mount; the probe is
  // silent by design — the decoy never depends on it succeeding.
  useEffect(() => {
    if (reported.current) {
      return
    }
    reported.current = true
    const init = async () => {
      await Promise.resolve()
      setPunchline(Math.floor(Math.random() * PUNCHLINES.length))
      try {
        await apiFetch("/api/admin/probe", { method: "POST" })
      } catch {
        // Ignored on purpose.
      }
    }
    void init()
  }, [])

  // Fake terminal typewriter. With reduced motion, render the full script.
  useEffect(() => {
    let cancelled = false
    const animate = async () => {
      await Promise.resolve()
      if (cancelled) {
        return
      }
      if (reducedMotion) {
        setTypedLines(TERMINAL_SCRIPT)
        return
      }
      setTypedLines([])
      for (let shown = 1; shown <= TERMINAL_SCRIPT.length; shown++) {
        await new Promise((resolve) => setTimeout(resolve, TYPE_STEP_MS))
        if (cancelled) {
          return
        }
        setTypedLines(TERMINAL_SCRIPT.slice(0, shown))
      }
    }
    void animate()
    return () => {
      cancelled = true
    }
  }, [reducedMotion])

  const reroll = useCallback(() => {
    setPunchline((current) => nextPunchline(current))
    setAttempts((n) => n + 1)
  }, [])

  const active = PUNCHLINES[punchline] ?? PUNCHLINES[0]!

  return (
    <div className="relative flex min-h-svh flex-1 flex-col justify-between bg-background text-foreground overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[680px] h-[320px] bg-brand/8 blur-[120px] rounded-full -z-10"
        aria-hidden
      />

      {/* Minimal Top Bar */}
      <header className="flex items-center justify-between border-b border-border/60 bg-background/80 px-4 sm:px-8 py-3.5 backdrop-blur-xl">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <NotraMark className="size-6 transition-transform group-hover:scale-105" />
          <span className="text-sm font-semibold tracking-tight">Notra</span>
          <span className="rounded-md border border-border/80 bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            /admin · honeypot
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/" />}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Home</span>
          </Button>
          <Button
            size="sm"
            render={<Link href="/new" />}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <Sparkles className="size-3.5" />
            <span>Write a Note</span>
          </Button>
        </div>
      </header>

      {/* Main Decoy Showcase */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 sm:px-6 py-12">
        {/* Security Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-mono text-brand-ink">
          <ShieldAlert className="size-3.5" />
          <span>DECOY HONEYPOT · PROBE #{attempts} RECORDED</span>
        </div>

        {/* Multilingual Punchline Card */}
        <div className="w-full rounded-2xl border border-border/80 bg-card p-6 sm:p-10 text-center shadow-xl space-y-5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <Globe className="size-3.5 text-brand-ink" />
            <span>{active.lang}</span>
            <span className="text-border">·</span>
            <span className="font-mono text-[10px]">{active.code}</span>
          </div>

          <p
            aria-live="polite"
            className="mx-auto max-w-xl text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-foreground text-balance leading-tight"
          >
            {active.line}
          </p>

          <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={reroll}
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background px-4 py-2 text-xs font-medium text-foreground shadow-2xs transition-all hover:border-brand/50 hover:bg-muted active:scale-95"
            >
              <RefreshCw className="size-3.5 text-brand-ink" />
              <span>Another language</span>
            </button>
          </div>
        </div>

        {/* Simulated Security Terminal */}
        <div
          role="img"
          aria-label="Fake terminal showing a failed admin login"
          className="w-full overflow-hidden rounded-2xl border border-border/80 bg-[#121212] text-zinc-200 shadow-2xl"
        >
          {/* Terminal Titlebar */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-zinc-700" />
                <span className="size-2.5 rounded-full bg-zinc-700" />
                <span className="size-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="ml-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                <Terminal className="size-3.5 text-[#A5AD91]" />
                <span>notra-guard — /admin</span>
              </span>
            </div>
            <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] text-amber-300">
              HONEYPOT_TRAP
            </span>
          </div>

          {/* Terminal Output */}
          <div className="p-5 font-mono text-xs sm:text-[13px] leading-7 space-y-0.5 min-h-[190px]">
            {typedLines.map((line) => {
              const isDenied = line.startsWith("ACCESS DENIED")
              const isCommand = line.startsWith("$")
              return (
                <p
                  key={line}
                  className={
                    isDenied
                      ? "font-semibold text-amber-300 pt-1"
                      : isCommand
                      ? "text-zinc-100 font-semibold"
                      : "text-[#A5AD91]"
                  }
                >
                  {line}
                </p>
              )
            })}
            {!reducedMotion && typedLines.length < TERMINAL_SCRIPT.length ? (
              <span aria-hidden className="inline-block animate-pulse text-[#A5AD91]">
                ▌
              </span>
            ) : null}
          </div>

          {/* Terminal Telemetry Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 bg-zinc-900/50 px-4 py-2 font-mono text-[10px] text-zinc-400">
            <span>surface: public_decoy</span>
            <span>ip_hash: sha256_logged</span>
            <span className="text-[#A5AD91]">real_admin: [REDACTED_PATH]</span>
          </div>
        </div>

        {/* Architectural Explanation Footer Card */}
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-xs text-muted-foreground max-w-xl">
          <Lock className="size-4 text-brand-ink shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            There is no admin panel here. Notra is open source — the real
            admin surface lives behind a private path (<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">ADMIN_SECRET_PATH</code>) known only to the operator and verified server-side via <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">profiles.is_admin</code>.
          </p>
        </div>
      </main>
    </div>
  )
}
