"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { apiFetch } from "@/lib/client/api"

/**
 * The /admin decoy (SPEC §14/§27 Phase 9): a harmless multilingual "nice
 * try" joke. It contains no admin functionality and reveals nothing — it
 * looks the same for every visitor. The punchline re-rolls on click and the
 * fake terminal animates unless the visitor prefers reduced motion.
 */

const PUNCHLINES: Array<{ lang: string; line: string }> = [
  { lang: "English", line: "Nice try. This is a decoy." },
  { lang: "Bahasa Indonesia", line: "Nice try. Ini cuma umpan." },
  { lang: "Basa Jawa", line: "Cobi maneh… kiye mung umpan, le." },
  { lang: "日本語", line: "いい挑戦です。ここはただのおとりです。" },
  { lang: "Français", line: "Bien joué… mais c'est un appât." },
  { lang: "Español", line: "Buen intento. Esto es solo un señuelo." },
  { lang: "Deutsch", line: "Guter Versuch. Das ist nur ein Köder." },
  { lang: "Basa Sunda", line: "Nyobian deui? Ieu ngan sa umpan." },
  { lang: "Português", line: "Boa tentativa. Isto é apenas uma isca." },
  { lang: "Italiano", line: "Bel tentativo. Questo è solo un'esca." },
  { lang: "한국어", line: "좋은 시도네요. 여긴 그저 미끼일 뿐입니다." },
  { lang: "Türkçe", line: "İyi deneme. Burası sadece bir yem." },
]

const TERMINAL_SCRIPT = [
  "$ opennotepad admin --login",
  "> resolving /admin …",
  "> checking privileges …",
  "> privileges: none",
  "> route purpose: entertainment",
  "ACCESS DENIED — have a great day",
]

const TYPE_STEP_MS = 700

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
  }, [])

  const active = PUNCHLINES[punchline] ?? PUNCHLINES[0]!

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <p
        aria-live="polite"
        className="max-w-xl text-center text-2xl font-semibold text-balance md:text-3xl"
      >
        {active.line}
      </p>
      <p className="text-sm text-muted-foreground">{active.lang}</p>
      <button
        type="button"
        onClick={reroll}
        className="rounded-lg border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
      >
        Another language
      </button>

      <div
        role="img"
        aria-label="Fake terminal showing a failed admin login"
        className="w-full max-w-md rounded-xl border bg-black/90 p-4 font-mono text-xs leading-6 text-green-400"
      >
        {typedLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {!reducedMotion && typedLines.length < TERMINAL_SCRIPT.length ? (
          <span aria-hidden className="animate-pulse">
            ▌
          </span>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        There is no admin panel here. OpenNotepad is open source — the real
        admin surface lives behind a private path known only to the operator.
      </p>
    </div>
  )
}
